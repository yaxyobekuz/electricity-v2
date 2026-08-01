"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

/**
 * TP boshqaruvi — mustaqil bo'lim.
 * Bu fayl faqat `/tp` sahifalariga xizmat qiladi.
 */

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function refresh() {
  revalidatePath("/tp", "layout");
  revalidatePath("/");
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Bo'sh qoldirilsa `null`, son bo'lmasa `undefined` (xato belgisi). */
function optionalInt(formData: FormData, key: string): number | null | undefined {
  const raw = text(formData, key);
  if (raw === "") return null;

  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

function describeError(error: unknown, fallback: string): string {
  const code = (error as { code?: string })?.code;
  if (code === "P2002")
    return "Bu TP raqami yoki hisoblagich raqami allaqachon mavjud.";
  if (code === "P2025") return "TP topilmadi.";
  return fallback;
}

export async function saveTp(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = text(formData, "id");
  const tpNumber = text(formData, "tpNumber");
  const feederId = text(formData, "feederId");
  const meterType = text(formData, "meterType");
  const meterSerial = text(formData, "meterSerial");
  const address = text(formData, "address");

  if (!tpNumber) return { status: "error", message: "TP raqami kiritilmadi." };
  if (!feederId) return { status: "error", message: "Fider tanlanmadi." };

  const coefficient = optionalInt(formData, "coefficient");
  if (coefficient === undefined)
    return { status: "error", message: "Koeffitsient butun son bo'lishi kerak." };
  if (coefficient === null || coefficient <= 0)
    return { status: "error", message: "Koeffitsient noldan katta bo'lishi kerak." };

  const capacityKva = optionalInt(formData, "capacityKva");
  const consumersTotal = optionalInt(formData, "consumersTotal");
  const consumersOnline = optionalInt(formData, "consumersOnline");
  const consumersOffline = optionalInt(formData, "consumersOffline");

  for (const [value, label] of [
    [capacityKva, "Quvvat"],
    [consumersTotal, "Jami abonent"],
    [consumersOnline, "Aloqadagi abonent"],
    [consumersOffline, "Aloqadan chiqqan abonent"],
  ] as const) {
    if (value === undefined)
      return { status: "error", message: `${label} manfiy bo'lmagan butun son bo'lishi kerak.` };
  }

  // Mantiqiy tekshiruv: qismlar yig'indisi jamidan oshib ketmasin.
  const online = consumersOnline as number | null;
  const offline = consumersOffline as number | null;
  const total = consumersTotal as number | null;

  if (total !== null && online !== null && offline !== null) {
    if (online + offline !== total) {
      return {
        status: "error",
        message: `Aloqada (${online}) + aloqadan chiqqan (${offline}) = ${
          online + offline
        }, lekin jami ${total} deb kiritilgan.`,
      };
    }
  }

  const data = {
    tpNumber,
    feederId,
    coefficient: coefficient as number,
    meterType: meterType || null,
    meterSerial: meterSerial || null,
    address: address || null,
    capacityKva: capacityKva as number | null,
    consumersTotal: total,
    consumersOnline: online,
    consumersOffline: offline,
  };

  try {
    if (id) await prisma.tpPoint.update({ where: { id }, data });
    else await prisma.tpPoint.create({ data });

    refresh();
    return { status: "success", message: `TP ${tpNumber} saqlandi.` };
  } catch (error) {
    return { status: "error", message: describeError(error, "Saqlashda xato.") };
  }
}

export async function deleteTp(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.tpPoint.delete({ where: { id } });
  refresh();
  redirect("/tp");
}
