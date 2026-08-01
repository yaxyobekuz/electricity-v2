import { prisma } from "@/lib/prisma";
import { computeLosses, toNumber } from "@/lib/calc";
import { getFeederReport } from "@/lib/reports";
import type { FeederReportRow } from "@/lib/reports";

/**
 * Boshqaruv paneli uchun barcha yig'ma ma'lumot — bitta joyda.
 *
 * `feederId` berilsa faqat o'sha fider kesimi, aks holda butun tarmoq.
 */

export type ProblemTp = {
  id: string;
  tpNumber: string;
  feederName: string;
  consumersTotal: number;
  consumersOffline: number;
  offlineShare: number;
  consumedKwh: number;
};

export type TransformerGroup = {
  id: string;
  name: string;
  capacityKva: number;
  feederCount: number;
  consumedKwh: number;
  /** Quvvatga nisbatan yuklama ulushi — fiderlar taqqoslash uchun. */
  share: number;
};

export type DashboardData = {
  period: Date;
  rows: FeederReportRow[];

  energy: {
    consumed: number;
    /** Oqimi o'lchangan fiderlar iste'moli — taqsimot shu ustida quriladi. */
    measuredConsumed: number;
    unmeasuredConsumed: number;
    /** Foydali oqim — TP hisoblagichlariga yetib borgan energiya. */
    flow: number;
    technical: number;
    commercial: number;
    totalLoss: number;
    flowShare: number;
    technicalShare: number;
    commercialShare: number;
    totalLossShare: number;
    flowMeasured: boolean;
  };

  consumers: {
    total: number;
    online: number;
    offline: number;
    onlineShare: number;
    offlineShare: number;
    tpCount: number;
    meterCount: number;
  };

  network: {
    substationName: string | null;
    voltageType: string | null;
    totalCapacityKva: number;
    transformers: TransformerGroup[];
  };

  tariffs: { label: string; value: number; share: number }[];
  reactive: { plus: number; minus: number; net: number };

  problemTps: ProblemTp[];
  /** Iste'mol bo'yicha eng yuqori va eng past fiderlar. */
  topFeeders: FeederReportRow[];
  bottomFeeders: FeederReportRow[];
};

export async function getDashboardData(
  period: Date,
  feederId: string | null,
): Promise<DashboardData> {
  const report = await getFeederReport(period);

  const rows = feederId
    ? report.rows.filter((r) => r.feederId === feederId)
    : report.rows;

  const [tpReadings, substation, transformers] = await Promise.all([
    prisma.tpReading.findMany({
      where: {
        period,
        ...(feederId ? { tpPoint: { feederId } } : {}),
      },
      select: {
        consumedKwh: true,
        zoneT1: true,
        zoneT2: true,
        zoneT3: true,
        zoneT4: true,
        reactivePlus: true,
        reactiveMinus: true,
        tpPoint: {
          select: {
            id: true,
            tpNumber: true,
            meterSerial: true,
            consumersTotal: true,
            consumersOnline: true,
            consumersOffline: true,
            feeder: { select: { name: true } },
          },
        },
      },
    }),
    prisma.substation.findFirst({
      select: { name: true, voltageType: true },
      orderBy: { name: "asc" },
    }),
    prisma.transformer.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        capacityKva: true,
        feeders: { select: { id: true } },
      },
    }),
  ]);

  // ── Energiya ──────────────────────────────────────────────────
  const consumed = rows.reduce((s, r) => s + (r.consumedKwh ?? 0), 0);
  const measuredRows = rows.filter((r) => r.flowMeasured);
  const measuredConsumed = measuredRows.reduce(
    (s, r) => s + (r.consumedKwh ?? 0),
    0,
  );
  const flow = measuredRows.reduce((s, r) => s + r.electricFlowKwh, 0);
  const technical = measuredRows.reduce(
    (s, r) => s + (r.technicalLossKwh ?? 0),
    0,
  );
  const commercial = measuredRows.reduce(
    (s, r) => s + (r.commercialLossKwh ?? 0),
    0,
  );
  const totalLoss = technical + commercial;
  const share = (v: number) =>
    measuredConsumed > 0 ? (v / measuredConsumed) * 100 : 0;

  // ── Abonentlar ────────────────────────────────────────────────
  const consumers = tpReadings.reduce(
    (acc, r) => ({
      total: acc.total + (r.tpPoint.consumersTotal ?? 0),
      online: acc.online + (r.tpPoint.consumersOnline ?? 0),
      offline: acc.offline + (r.tpPoint.consumersOffline ?? 0),
      meters: acc.meters + (r.tpPoint.meterSerial ? 1 : 0),
    }),
    { total: 0, online: 0, offline: 0, meters: 0 },
  );

  // ── Tarif zonalari ────────────────────────────────────────────
  const zones = tpReadings.reduce(
    (acc, r) => ({
      t1: acc.t1 + toNumber(r.zoneT1),
      t2: acc.t2 + toNumber(r.zoneT2),
      t3: acc.t3 + toNumber(r.zoneT3),
      t4: acc.t4 + toNumber(r.zoneT4),
    }),
    { t1: 0, t2: 0, t3: 0, t4: 0 },
  );
  const zoneTotal = zones.t1 + zones.t2 + zones.t3 + zones.t4;
  const tariffs = [
    { label: "T1", value: zones.t1 },
    { label: "T2", value: zones.t2 },
    { label: "T3", value: zones.t3 },
    { label: "T4", value: zones.t4 },
  ].map((z) => ({
    ...z,
    share: zoneTotal > 0 ? (z.value / zoneTotal) * 100 : 0,
  }));

  // ── Reaktiv energiya ──────────────────────────────────────────
  const reactivePlus = tpReadings.reduce(
    (s, r) => s + toNumber(r.reactivePlus),
    0,
  );
  const reactiveMinus = tpReadings.reduce(
    (s, r) => s + toNumber(r.reactiveMinus),
    0,
  );

  // ── VVOD'lar kesimi ───────────────────────────────────────────
  const consumedByFeeder = new Map(
    report.rows.map((r) => [r.feederId, r.consumedKwh ?? 0]),
  );
  const transformerGroups: TransformerGroup[] = transformers.map((t) => {
    const own = t.feeders.filter(
      (f) => !feederId || f.id === feederId,
    );
    const total = own.reduce(
      (s, f) => s + (consumedByFeeder.get(f.id) ?? 0),
      0,
    );
    return {
      id: t.id,
      name: t.name,
      capacityKva: t.capacityKva,
      feederCount: own.length,
      consumedKwh: total,
      share: 0,
    };
  });
  const transformerTotal = transformerGroups.reduce(
    (s, g) => s + g.consumedKwh,
    0,
  );
  for (const g of transformerGroups) {
    g.share = transformerTotal > 0 ? (g.consumedKwh / transformerTotal) * 100 : 0;
  }

  // ── Muammoli TP'lar ───────────────────────────────────────────
  const problemTps: ProblemTp[] = tpReadings
    .map((r) => {
      const total = r.tpPoint.consumersTotal ?? 0;
      const offline = r.tpPoint.consumersOffline ?? 0;
      return {
        id: r.tpPoint.id,
        tpNumber: r.tpPoint.tpNumber,
        feederName: r.tpPoint.feeder.name,
        consumersTotal: total,
        consumersOffline: offline,
        offlineShare: total > 0 ? (offline / total) * 100 : 0,
        consumedKwh: toNumber(r.consumedKwh),
      };
    })
    .filter((tp) => tp.consumersOffline > 0)
    .sort(
      (a, b) =>
        b.consumersOffline - a.consumersOffline ||
        b.offlineShare - a.offlineShare,
    )
    .slice(0, 5);

  const ranked = [...rows]
    .filter((r) => (r.consumedKwh ?? 0) > 0)
    .sort((a, b) => (b.consumedKwh ?? 0) - (a.consumedKwh ?? 0));

  return {
    period,
    rows,
    energy: {
      consumed,
      measuredConsumed,
      unmeasuredConsumed: consumed - measuredConsumed,
      flow,
      technical,
      commercial,
      totalLoss,
      flowShare: share(flow),
      technicalShare: share(technical),
      commercialShare: share(commercial),
      totalLossShare: share(totalLoss),
      flowMeasured: measuredRows.length > 0,
    },
    consumers: {
      total: consumers.total,
      online: consumers.online,
      offline: consumers.offline,
      onlineShare:
        consumers.total > 0 ? (consumers.online / consumers.total) * 100 : 0,
      offlineShare:
        consumers.total > 0 ? (consumers.offline / consumers.total) * 100 : 0,
      tpCount: tpReadings.length,
      meterCount: consumers.meters,
    },
    network: {
      substationName: substation?.name ?? null,
      voltageType: substation?.voltageType ?? null,
      totalCapacityKva: transformers.reduce((s, t) => s + t.capacityKva, 0),
      transformers: transformerGroups,
    },
    tariffs,
    reactive: {
      plus: reactivePlus,
      minus: reactiveMinus,
      net: reactivePlus - reactiveMinus,
    },
    problemTps,
    topFeeders: ranked.slice(0, 3),
    bottomFeeders: ranked.slice(-3).reverse(),
  };
}

/** Bitta fider uchun yo'qotish tarkibi — qiyosiy diagramma uchun. */
export function feederLossParts(row: FeederReportRow) {
  if (!row.flowMeasured || row.consumedKwh === null) return null;

  const losses = computeLosses({
    consumedKwh: row.consumedKwh,
    electricFlowKwh: row.electricFlowKwh,
    technicalLossPercent: row.technicalLossPercent,
  });

  return {
    technical: losses.technicalLossKwh,
    commercial: losses.commercialLossKwh,
  };
}
