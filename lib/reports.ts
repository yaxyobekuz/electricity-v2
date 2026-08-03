import { prisma } from "@/lib/prisma";
import { computeLosses, toNumber } from "@/lib/calc";

/**
 * Hisobot so'rovlari.
 *
 * Muhim: "Elektr oqimi" QO'LDA KIRITILMAYDI — u shu fiderga ulangan
 * TP hisoblagichlari yig'indisi. Bu haqiqiy hisobotlarda tekshirilgan:
 * Jo'jaxona TP yig'indisi 317 911.80 = fayldagi "Elektr oqimi" qiymati.
 */

export type FeederReportRow = {
  feederId: string;
  feederName: string;
  transformerName: string;
  coefficient: number;
  /** Fider hisoblagichi bo'yicha o'lchov. Shu davrda o'lchov bo'lmasa null. */
  previousValue: number | null;
  meterValue: number | null;
  difference: number | null;
  consumedKwh: number | null;
  /**
   * Foydali oqim — hisobotda ko'rsatilgan "Elektr oqimi".
   * Ko'rsatilmagan bo'lsa TP hisoblagichlari yig'indisiga tushadi.
   */
  electricFlowKwh: number;
  /** Oqim qayerdan olindi — hisobotdanmi yoki TP'lardan hisoblandimi. */
  flowSource: "reported" | "tp" | "none";
  /** TP hisoblagichlari yig'indisi — hisobotdagi oqim bilan solishtirish uchun. */
  tpSumKwh: number;
  tpCount: number;
  tpWithReadingCount: number;
  technicalLossKwh: number | null;
  commercialLossKwh: number | null;
  technicalLossPercent: number;
  /** Fiderga TP biriktirilganmi — bo'lmasa oqim o'lchanmagan hisoblanadi. */
  flowMeasured: boolean;
  /**
   * TP yig'indisi fider iste'molidan katta — fizikaviy imkonsiz holat.
   * Sabab: koeffitsient xato, TP boshqa fiderga tegishli yoki o'lchov noto'g'ri.
   */
  flowExceedsConsumption: boolean;
};

export type FeederReport = {
  period: Date;
  rows: FeederReportRow[];
  totals: {
    consumedKwh: number;
    electricFlowKwh: number;
    technicalLossKwh: number;
    commercialLossKwh: number;
  };
};

export async function getFeederReport(period: Date): Promise<FeederReport> {
  const feeders = await prisma.feeder.findMany({
    orderBy: [{ transformer: { name: "asc" } }, { name: "asc" }],
    include: {
      transformer: { select: { name: true } },
      readings: { where: { period } },
      _count: { select: { tpPoints: true } },
    },
  });

  // TP iste'moli fider kesimida — bitta so'rovda.
  const tpSums = await prisma.tpReading.groupBy({
    by: ["tpPointId"],
    where: { period },
    _sum: { consumedKwh: true },
  });

  const tpPoints = await prisma.tpPoint.findMany({
    select: { id: true, feederId: true },
  });
  const feederOfTp = new Map(tpPoints.map((tp) => [tp.id, tp.feederId]));

  const flowByFeeder = new Map<string, { sum: number; count: number }>();
  for (const item of tpSums) {
    const feederId = feederOfTp.get(item.tpPointId);
    if (!feederId) continue;

    const entry = flowByFeeder.get(feederId) ?? { sum: 0, count: 0 };
    entry.sum += toNumber(item._sum.consumedKwh);
    entry.count += 1;
    flowByFeeder.set(feederId, entry);
  }

  const rows: FeederReportRow[] = feeders.map((feeder) => {
    const reading = feeder.readings[0];
    const flow = flowByFeeder.get(feeder.id) ?? { sum: 0, count: 0 };

    const consumedKwh = reading ? toNumber(reading.consumedKwh) : null;
    const technicalLossPercent = reading
      ? toNumber(reading.technicalLossPercent)
      : 12;

    // Foydali oqim FAQAT hisobotdagi "Elektr oqimi" ustunidan olinadi.
    //
    // TP yig'indisiga tushib qolish XATO bo'lardi: TP qamrovi ko'pincha
    // to'liq emas (masalan Paranda'da 270 000 kVt·s iste'molga atigi 2 ta TP),
    // shunda oqim juda past chiqib, farq soxta "tijoriy yo'qotish" bo'lib
    // ko'rinardi. Oqim ko'rsatilmagan bo'lsa u NOMA'LUM.
    //
    // TP yig'indisi `tpSumKwh` da alohida turadi — hisobotdagi oqim bilan
    // solishtirish uchun foydali.
    const reportedFlow =
      reading?.electricFlowKwh !== null && reading?.electricFlowKwh !== undefined
        ? toNumber(reading.electricFlowKwh)
        : null;

    const flowSource: FeederReportRow["flowSource"] =
      reportedFlow !== null ? "reported" : "none";

    const electricFlowKwh = reportedFlow ?? 0;
    const flowMeasured = flowSource === "reported";

    let technicalLossKwh: number | null = null;
    let commercialLossKwh: number | null = null;

    if (consumedKwh !== null && !reading?.isBaseline) {
      const losses = computeLosses({
        consumedKwh,
        electricFlowKwh,
        technicalLossPercent,
      });
      technicalLossKwh = losses.technicalLossKwh;

      // Oqim noma'lum bo'lsa uni NOL deb olmaymiz — aks holda butun iste'mol
      // "tijoriy yo'qotish" bo'lib ko'rinadi, aslida u shunchaki o'lchanmagan.
      commercialLossKwh = flowMeasured ? losses.commercialLossKwh : null;
    }

    return {
      feederId: feeder.id,
      feederName: feeder.name,
      transformerName: feeder.transformer.name,
      coefficient: feeder.coefficient,
      previousValue: reading ? toNumber(reading.previousValue) : null,
      meterValue: reading ? toNumber(reading.meterValue) : null,
      difference: reading ? toNumber(reading.difference) : null,
      consumedKwh,
      electricFlowKwh,
      flowSource,
      tpSumKwh: flow.sum,
      tpCount: feeder._count.tpPoints,
      tpWithReadingCount: flow.count,
      technicalLossKwh,
      commercialLossKwh,
      technicalLossPercent,
      flowMeasured,
      flowExceedsConsumption:
        flowMeasured && consumedKwh !== null && electricFlowKwh > consumedKwh,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      consumedKwh: acc.consumedKwh + (row.consumedKwh ?? 0),
      electricFlowKwh: acc.electricFlowKwh + row.electricFlowKwh,
      technicalLossKwh: acc.technicalLossKwh + (row.technicalLossKwh ?? 0),
      commercialLossKwh: acc.commercialLossKwh + (row.commercialLossKwh ?? 0),
    }),
    { consumedKwh: 0, electricFlowKwh: 0, technicalLossKwh: 0, commercialLossKwh: 0 },
  );

  return { period, rows, totals };
}

/** Ma'lumot mavjud bo'lgan davrlar ro'yxati — davr tanlagich uchun. */
export async function getAvailablePeriods(): Promise<Date[]> {
  const [tp, feeder] = await Promise.all([
    prisma.tpReading.findMany({
      distinct: ["period"],
      select: { period: true },
      orderBy: { period: "desc" },
    }),
    prisma.feederReading.findMany({
      distinct: ["period"],
      select: { period: true },
      orderBy: { period: "desc" },
    }),
  ]);

  const all = new Map<number, Date>();
  for (const item of [...tp, ...feeder]) {
    all.set(item.period.getTime(), item.period);
  }

  return [...all.values()].sort((a, b) => b.getTime() - a.getTime());
}
