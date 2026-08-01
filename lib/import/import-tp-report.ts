import { prisma } from "@/lib/prisma";
import { computeReading, toNumber } from "@/lib/calc";
import type { TpReportRow } from "./parse-excel";

/**
 * Excel'dan o'qilgan qatorlarni bazaga yozadi.
 *
 * Ikki rejim:
 *   dryRun: true  — hech narsa yozilmaydi, faqat nima bo'lishi hisoblanadi.
 *   dryRun: false — o'zgarishlar bitta tranzaksiyada saqlanadi.
 *
 * Preview bo'lmasa foydalanuvchi 143 qatorlik faylni ko'r-ko'rona yuklaydi va
 * xato ma'lumot bazaga tushib ketadi.
 */

export type RowOutcome = {
  excelRow: number;
  tpNumber: string;
  feederName: string;
  status: "create" | "update" | "skip";
  /** Nega o'tkazib yuborilgani yoki e'tibor berish kerak bo'lgan holat. */
  message?: string;
  difference?: number;
  consumedKwh?: number;
  /** Fayldagi qiymat bizning hisobimizdan farq qilsa. */
  mismatch?: string;
};

export type ImportSummary = {
  period: Date;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  /** Bazada topilmagan fider nomlari. */
  unknownFeeders: string[];
  outcomes: RowOutcome[];
  committed: boolean;
};

/** Nomlarni solishtirish uchun: registr, apostrof va ortiqcha probellarni yo'qotadi. */
function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’`ʻ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function importTpReport({
  rows,
  period,
  dryRun,
}: {
  rows: TpReportRow[];
  period: Date;
  dryRun: boolean;
}): Promise<ImportSummary> {
  const feeders = await prisma.feeder.findMany({
    select: { id: true, name: true, aliases: true },
  });

  // Nom → fider id. Asosiy nom ham, aliaslar ham kalit bo'ladi.
  const feederByName = new Map<string, string>();
  for (const feeder of feeders) {
    feederByName.set(normalizeName(feeder.name), feeder.id);
    for (const alias of feeder.aliases) {
      feederByName.set(normalizeName(alias), feeder.id);
    }
  }

  const existingTps = await prisma.tpPoint.findMany({
    select: { id: true, tpNumber: true, coefficient: true },
  });
  const tpByNumber = new Map(existingTps.map((tp) => [tp.tpNumber, tp]));

  const existingReadings = await prisma.tpReading.findMany({
    where: { period },
    select: { tpPointId: true },
  });
  const hasReading = new Set(existingReadings.map((r) => r.tpPointId));

  const outcomes: RowOutcome[] = [];
  const unknownFeeders = new Set<string>();

  type Pending = {
    tpNumber: string;
    feederId: string;
    meterType: string | null;
    meterSerial: string | null;
    coefficient: number;
    reading: {
      meterValue: number;
      previousValue: number;
      difference: number;
      consumedKwh: number;
      coefficient: number;
      consumersTotal: number | null;
      consumersOnline: number | null;
      consumersOffline: number | null;
      zoneT1: number | null;
      zoneT2: number | null;
      zoneT3: number | null;
      zoneT4: number | null;
      reactivePlus: number | null;
      reactiveMinus: number | null;
    };
  };

  const pending: Pending[] = [];

  for (const row of rows) {
    const feederId = feederByName.get(normalizeName(row.feederName));

    if (!feederId) {
      unknownFeeders.add(row.feederName);
      outcomes.push({
        excelRow: row.excelRow,
        tpNumber: row.tpNumber,
        feederName: row.feederName,
        status: "skip",
        message: `"${row.feederName}" fideri bazada topilmadi.`,
      });
      continue;
    }

    const existingTp = tpByNumber.get(row.tpNumber);
    // Koeffitsient fayldan olinadi; bo'lmasa bazadagi TP qiymati ishlatiladi.
    const coefficient = row.coefficient ?? existingTp?.coefficient ?? null;

    if (coefficient === null || coefficient <= 0) {
      outcomes.push({
        excelRow: row.excelRow,
        tpNumber: row.tpNumber,
        feederName: row.feederName,
        status: "skip",
        message: "Koeffitsient yo'q yoki noldan katta emas.",
      });
      continue;
    }

    if (row.meterValue === null) {
      outcomes.push({
        excelRow: row.excelRow,
        tpNumber: row.tpNumber,
        feederName: row.feederName,
        status: "skip",
        message: "Joriy ko'rsatkich bo'sh.",
      });
      continue;
    }

    const previousValue = row.previousValue ?? 0;
    const { difference, consumedKwh } = computeReading({
      meterValue: row.meterValue,
      previousValue,
      coefficient,
    });

    // Fayldagi tayyor qiymat bizning hisobimizga mos kelmasa — ogohlantiramiz,
    // lekin BIZNING hisobimizni saqlaymiz (yagona haqiqat manbai formula).
    let mismatch: string | undefined;
    if (
      row.fileConsumedKwh !== null &&
      Math.abs(toNumber(row.fileConsumedKwh) - consumedKwh) > 0.5
    ) {
      mismatch = `Faylda ${row.fileConsumedKwh}, hisob bo'yicha ${consumedKwh}`;
    }

    const isUpdate = existingTp ? hasReading.has(existingTp.id) : false;

    outcomes.push({
      excelRow: row.excelRow,
      tpNumber: row.tpNumber,
      feederName: row.feederName,
      status: isUpdate ? "update" : "create",
      difference,
      consumedKwh,
      mismatch,
      message:
        difference < 0
          ? "Farq manfiy — hisoblagich almashtirilgan bo'lishi mumkin."
          : undefined,
    });

    pending.push({
      tpNumber: row.tpNumber,
      feederId,
      meterType: row.meterType,
      meterSerial: row.meterSerial,
      coefficient,
      reading: {
        meterValue: row.meterValue,
        previousValue,
        difference,
        consumedKwh,
        coefficient,
        consumersTotal: row.consumersTotal,
        consumersOnline: row.consumersOnline,
        consumersOffline: row.consumersOffline,
        zoneT1: row.zoneT1,
        zoneT2: row.zoneT2,
        zoneT3: row.zoneT3,
        zoneT4: row.zoneT4,
        reactivePlus: row.reactivePlus,
        reactiveMinus: row.reactiveMinus,
      },
    });
  }

  if (!dryRun && pending.length > 0) {
    // Bitta tranzaksiya: yarim yozilgan import qolib ketmasligi uchun.
    // Ketma-ket bajariladi, chunki ko'rsatkichni yozishdan oldin TP'ning
    // id'si kerak — yangi TP uchun u faqat upsert'dan keyin ma'lum bo'ladi.
    await prisma.$transaction(
      async (tx) => {
        for (const item of pending) {
          // TP kartochkasidagi JORIY abonent sonlari ham yangilanadi —
          // ular oxirgi hisobotdagi qiymatni aks ettirishi kerak.
          const card = {
            feederId: item.feederId,
            meterType: item.meterType,
            meterSerial: item.meterSerial,
            coefficient: item.coefficient,
            consumersTotal: item.reading.consumersTotal,
            consumersOnline: item.reading.consumersOnline,
            consumersOffline: item.reading.consumersOffline,
          };

          const tp = await tx.tpPoint.upsert({
            where: { tpNumber: item.tpNumber },
            update: card,
            create: { tpNumber: item.tpNumber, ...card },
            select: { id: true },
          });

          await tx.tpReading.upsert({
            where: { tpPointId_period: { tpPointId: tp.id, period } },
            update: item.reading,
            create: { tpPointId: tp.id, period, ...item.reading },
          });
        }
      },
      { timeout: 120_000 },
    );
  }

  return {
    period,
    totalRows: rows.length,
    created: outcomes.filter((o) => o.status === "create").length,
    updated: outcomes.filter((o) => o.status === "update").length,
    skipped: outcomes.filter((o) => o.status === "skip").length,
    unknownFeeders: [...unknownFeeders],
    outcomes,
    committed: !dryRun,
  };
}
