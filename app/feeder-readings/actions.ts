"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  computeReading,
  parsePeriod,
  previousPeriod,
  readingWarnings,
  toNumber,
} from "@/lib/calc";

export type ReadingFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  warnings?: string[];
};

/**
 * Fider ko'rsatkichini saqlaydi.
 *
 * Oldingi qiymat QO'LDA KIRITILMAYDI — u shu fiderning oldingi davrdagi
 * o'lchovidan olinadi. Oldingi o'lchov bo'lmasa yozuv "boshlang'ich" deb
 * belgilanadi va iste'mol hisoblanmaydi.
 */
export async function saveFeederReading(
  _prev: ReadingFormState,
  formData: FormData,
): Promise<ReadingFormState> {
  const feederId = String(formData.get("feederId") ?? "").trim();
  const periodInput = String(formData.get("period") ?? "").trim();
  const meterValueInput = String(formData.get("meterValue") ?? "").trim();
  const lossPercentInput = String(formData.get("technicalLossPercent") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!feederId) return { status: "error", message: "Fider tanlanmadi." };

  const period = parsePeriod(periodInput);
  if (!period) return { status: "error", message: "Hisobot davri noto'g'ri." };

  const meterValue = Number(meterValueInput.replace(",", "."));
  if (!Number.isFinite(meterValue)) {
    return { status: "error", message: "Ko'rsatkich son bo'lishi kerak." };
  }
  if (meterValue < 0) {
    return { status: "error", message: "Ko'rsatkich manfiy bo'lishi mumkin emas." };
  }

  const feeder = await prisma.feeder.findUnique({
    where: { id: feederId },
    select: { id: true, coefficient: true },
  });
  if (!feeder) return { status: "error", message: "Fider topilmadi." };

  // Oldingi davr o'lchovi — avtomatik topiladi.
  const previous = await prisma.feederReading.findUnique({
    where: { feederId_period: { feederId, period: previousPeriod(period) } },
    select: { meterValue: true },
  });

  const isBaseline = previous === null;
  const previousValue = previous ? toNumber(previous.meterValue) : 0;

  const { difference, consumedKwh } = computeReading({
    meterValue,
    previousValue,
    coefficient: feeder.coefficient,
    isBaseline,
  });

  const technicalLossPercent =
    lossPercentInput === "" ? 12 : Number(lossPercentInput.replace(",", "."));
  if (!Number.isFinite(technicalLossPercent) || technicalLossPercent < 0) {
    return { status: "error", message: "Texnologik yo'qotish foizi noto'g'ri." };
  }

  const values = {
    meterValue,
    previousValue,
    difference,
    consumedKwh,
    coefficient: feeder.coefficient,
    technicalLossPercent,
    isBaseline,
    note: note || null,
  };

  await prisma.feederReading.upsert({
    where: { feederId_period: { feederId, period } },
    update: values,
    create: { feederId, period, ...values },
  });

  revalidatePath("/feeder-readings");
  revalidatePath("/");

  const warnings = readingWarnings({
    meterValue,
    previousValue,
    coefficient: feeder.coefficient,
    isBaseline,
  });

  if (isBaseline) {
    warnings.push(
      "Bu fiderning birinchi o'lchovi — oldingi davr topilmadi, shuning uchun iste'mol hisoblanmadi.",
    );
  }

  return {
    status: "success",
    message: isBaseline
      ? "Boshlang'ich o'lchov sifatida saqlandi."
      : `Saqlandi: farq ${difference}, iste'mol ${consumedKwh} kVt·s.`,
    warnings,
  };
}

export async function deleteFeederReading(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.feederReading.delete({ where: { id } });

  revalidatePath("/feeder-readings");
  revalidatePath("/");
}
