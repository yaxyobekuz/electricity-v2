"use server";

import { revalidatePath } from "next/cache";

import { listSheets, parseTpReport } from "@/lib/import/parse-excel";
import { importTpReport } from "@/lib/import/import-tp-report";
import type { ImportSummary } from "@/lib/import/import-tp-report";
import { parsePeriod } from "@/lib/calc";

export type ImportState = {
  status: "idle" | "preview" | "done" | "error";
  message?: string;
  sheets?: string[];
  summary?: ImportSummary;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function importExcelAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const file = formData.get("file");
  const sheetName = String(formData.get("sheet") ?? "").trim();
  const periodInput = String(formData.get("period") ?? "").trim();
  // "preview" — faqat tekshirish, "commit" — bazaga yozish.
  const mode = String(formData.get("mode") ?? "preview");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Fayl tanlanmadi." };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      status: "error",
      message: `Fayl juda katta (${(file.size / 1024 / 1024).toFixed(1)} MB). Chegara — 10 MB.`,
    };
  }

  if (!/\.xlsx$/i.test(file.name)) {
    return {
      status: "error",
      message: "Faqat .xlsx fayllar qabul qilinadi.",
    };
  }

  try {
    const buffer = await file.arrayBuffer();
    const sheets = await listSheets(buffer);

    const parsed = await parseTpReport(buffer, sheetName || undefined);

    // Davr: foydalanuvchi ko'rsatgani ustun, bo'lmasa fayl sarlavhasidan.
    const period = (periodInput ? parsePeriod(periodInput) : null) ?? parsed.period;

    if (!period) {
      return {
        status: "error",
        sheets,
        message:
          "Hisobot davri aniqlanmadi. Fayl sarlavhasida sana topilmadi — davrni qo'lda tanlang.",
      };
    }

    if (parsed.rows.length === 0) {
      return {
        status: "error",
        sheets,
        message:
          parsed.issues.join(" ") || "Faylda ma'lumot qatori topilmadi.",
      };
    }

    const summary = await importTpReport({
      rows: parsed.rows,
      period,
      dryRun: mode !== "commit",
    });

    if (mode === "commit") {
      // Import bazani o'zgartirdi — hisobot sahifalari qayta hisoblansin.
      revalidatePath("/");
    }

    return {
      status: mode === "commit" ? "done" : "preview",
      sheets,
      summary,
      message: parsed.issues.length ? parsed.issues.join(" ") : undefined,
    };
  } catch (error) {
    return {
      status: "error",
      message: `Faylni o'qishda xato: ${
        error instanceof Error ? error.message : "noma'lum xato"
      }`,
    };
  }
}
