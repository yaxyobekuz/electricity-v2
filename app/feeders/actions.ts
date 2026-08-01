"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

/**
 * Fider boshqaruvi — mustaqil bo'lim.
 * Bu fayl faqat `/feeders` sahifalariga xizmat qiladi.
 */

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function refresh() {
  revalidatePath("/feeders", "layout");
  revalidatePath("/tp", "layout");
  revalidatePath("/feeder-readings");
  revalidatePath("/");
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalInt(formData: FormData, key: string): number | null | undefined {
  const raw = text(formData, key);
  if (raw === "") return null;

  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

function describeError(error: unknown, fallback: string): string {
  const code = (error as { code?: string })?.code;
  if (code === "P2002")
    return "Shu ввод ichida bu nomli fider allaqachon mavjud.";
  if (code === "P2025") return "Fider topilmadi.";
  return fallback;
}

export async function saveFeeder(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = text(formData, "id");
  const name = text(formData, "name");
  const transformerId = text(formData, "transformerId");
  const note = text(formData, "note");

  // Vergul bilan ajratilgan muqobil nomlar — Excel import shular bo'yicha ham qidiradi.
  const aliases = text(formData, "aliases")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  if (!name) return { status: "error", message: "Fider nomi kiritilmadi." };
  if (!transformerId) return { status: "error", message: "Ввод tanlanmadi." };

  const coefficient = optionalInt(formData, "coefficient");
  if (coefficient === undefined)
    return { status: "error", message: "Koeffitsient butun son bo'lishi kerak." };
  if (coefficient === null || coefficient <= 0)
    return { status: "error", message: "Koeffitsient noldan katta bo'lishi kerak." };

  const voltage = optionalInt(formData, "voltage");
  if (voltage === undefined)
    return { status: "error", message: "Kuchlanish butun son bo'lishi kerak." };

  const data = {
    name,
    transformerId,
    coefficient,
    voltage: voltage ?? 10,
    aliases,
    note: note || null,
  };

  try {
    if (id) await prisma.feeder.update({ where: { id }, data });
    else await prisma.feeder.create({ data });

    refresh();
    return { status: "success", message: `"${name}" fideri saqlandi.` };
  } catch (error) {
    return { status: "error", message: describeError(error, "Saqlashda xato.") };
  }
}

export async function deleteFeeder(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.feeder.delete({ where: { id } });
  refresh();
  redirect("/feeders");
}
