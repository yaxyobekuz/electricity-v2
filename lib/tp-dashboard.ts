import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/calc";

/**
 * TP bo'limi dashboardi uchun yig'ma ma'lumot.
 *
 * Barchasi bitta so'rovdan hisoblanadi — 143 TP uchun bu arzon va
 * kesimlarni JS'da bo'lish alohida so'rovlardan tez.
 */

export type TpRow = {
  id: string;
  tpNumber: string;
  feederId: string;
  feederName: string;
  coefficient: number;
  meterType: string | null;
  meterSerial: string | null;
  consumersTotal: number;
  consumersOnline: number;
  consumersOffline: number;
  offlineShare: number;
  consumedKwh: number;
  difference: number;
  hasReading: boolean;
};

export type TpDashboard = {
  period: Date | null;
  rows: TpRow[];

  totals: {
    tpCount: number;
    withReading: number;
    withoutReading: number;
    consumers: number;
    online: number;
    offline: number;
    onlineShare: number;
    offlineShare: number;
    consumed: number;
    averagePerTp: number;
    /** Abonentga to'g'ri keladigan o'rtacha iste'mol. */
    perConsumer: number;
  };

  /** Fiderlar kesimi — TP soni, iste'mol va abonentlar. */
  byFeeder: {
    feederId: string;
    feederName: string;
    tpCount: number;
    consumed: number;
    consumers: number;
    online: number;
    offline: number;
  }[];

  /** Koeffitsient bo'yicha nechta TP — shablon xatolarini ko'rsatadi. */
  byCoefficient: { coefficient: number; count: number; consumed: number }[];
  byMeterType: { type: string; count: number }[];

  tariffs: { label: string; value: number; share: number }[];
  reactive: { plus: number; minus: number; net: number };

  topConsumers: TpRow[];
  problemTps: TpRow[];
  /** Farqi manfiy — hisoblagich almashtirilgan yoki xato kiritilgan. */
  negativeTps: TpRow[];
};

export async function getTpDashboard(
  period: Date | null,
): Promise<TpDashboard> {
  const tpPoints = await prisma.tpPoint.findMany({
    orderBy: [{ feeder: { name: "asc" } }, { tpNumber: "asc" }],
    select: {
      id: true,
      tpNumber: true,
      feederId: true,
      coefficient: true,
      meterType: true,
      meterSerial: true,
      consumersTotal: true,
      consumersOnline: true,
      consumersOffline: true,
      feeder: { select: { name: true } },
      readings: period
        ? {
            where: { period },
            select: {
              consumedKwh: true,
              difference: true,
              zoneT1: true,
              zoneT2: true,
              zoneT3: true,
              zoneT4: true,
              reactivePlus: true,
              reactiveMinus: true,
            },
          }
        : { take: 0, select: { consumedKwh: true, difference: true, zoneT1: true, zoneT2: true, zoneT3: true, zoneT4: true, reactivePlus: true, reactiveMinus: true } },
    },
  });

  const rows: TpRow[] = tpPoints.map((tp) => {
    const reading = tp.readings[0];
    const total = tp.consumersTotal ?? 0;
    const offline = tp.consumersOffline ?? 0;

    return {
      id: tp.id,
      tpNumber: tp.tpNumber,
      feederId: tp.feederId,
      feederName: tp.feeder.name,
      coefficient: tp.coefficient,
      meterType: tp.meterType,
      meterSerial: tp.meterSerial,
      consumersTotal: total,
      consumersOnline: tp.consumersOnline ?? 0,
      consumersOffline: offline,
      offlineShare: total > 0 ? (offline / total) * 100 : 0,
      consumedKwh: toNumber(reading?.consumedKwh),
      difference: toNumber(reading?.difference),
      hasReading: Boolean(reading),
    };
  });

  const withReading = rows.filter((r) => r.hasReading);
  const consumers = rows.reduce((s, r) => s + r.consumersTotal, 0);
  const online = rows.reduce((s, r) => s + r.consumersOnline, 0);
  const offline = rows.reduce((s, r) => s + r.consumersOffline, 0);
  const consumed = rows.reduce((s, r) => s + r.consumedKwh, 0);

  // ── Fiderlar kesimi ───────────────────────────────────────────
  const feederMap = new Map<string, TpDashboard["byFeeder"][number]>();
  for (const r of rows) {
    const entry = feederMap.get(r.feederId) ?? {
      feederId: r.feederId,
      feederName: r.feederName,
      tpCount: 0,
      consumed: 0,
      consumers: 0,
      online: 0,
      offline: 0,
    };
    entry.tpCount += 1;
    entry.consumed += r.consumedKwh;
    entry.consumers += r.consumersTotal;
    entry.online += r.consumersOnline;
    entry.offline += r.consumersOffline;
    feederMap.set(r.feederId, entry);
  }

  // ── Koeffitsient va hisoblagich turi ──────────────────────────
  const coefMap = new Map<number, { count: number; consumed: number }>();
  const typeMap = new Map<string, number>();
  for (const r of rows) {
    const c = coefMap.get(r.coefficient) ?? { count: 0, consumed: 0 };
    c.count += 1;
    c.consumed += r.consumedKwh;
    coefMap.set(r.coefficient, c);

    const type = r.meterType ?? "ko'rsatilmagan";
    typeMap.set(type, (typeMap.get(type) ?? 0) + 1);
  }

  // ── Tarif zonalari va reaktiv ─────────────────────────────────
  const zones = tpPoints.reduce(
    (acc, tp) => {
      const r = tp.readings[0];
      return {
        t1: acc.t1 + toNumber(r?.zoneT1),
        t2: acc.t2 + toNumber(r?.zoneT2),
        t3: acc.t3 + toNumber(r?.zoneT3),
        t4: acc.t4 + toNumber(r?.zoneT4),
        rPlus: acc.rPlus + toNumber(r?.reactivePlus),
        rMinus: acc.rMinus + toNumber(r?.reactiveMinus),
      };
    },
    { t1: 0, t2: 0, t3: 0, t4: 0, rPlus: 0, rMinus: 0 },
  );
  const zoneTotal = zones.t1 + zones.t2 + zones.t3 + zones.t4;

  return {
    period,
    rows,
    totals: {
      tpCount: rows.length,
      withReading: withReading.length,
      withoutReading: rows.length - withReading.length,
      consumers,
      online,
      offline,
      onlineShare: consumers > 0 ? (online / consumers) * 100 : 0,
      offlineShare: consumers > 0 ? (offline / consumers) * 100 : 0,
      consumed,
      averagePerTp: withReading.length > 0 ? consumed / withReading.length : 0,
      perConsumer: consumers > 0 ? consumed / consumers : 0,
    },
    byFeeder: [...feederMap.values()].sort((a, b) => b.consumed - a.consumed),
    byCoefficient: [...coefMap.entries()]
      .map(([coefficient, v]) => ({ coefficient, ...v }))
      .sort((a, b) => b.count - a.count),
    byMeterType: [...typeMap.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    tariffs: [
      { label: "T1", value: zones.t1 },
      { label: "T2", value: zones.t2 },
      { label: "T3", value: zones.t3 },
      { label: "T4", value: zones.t4 },
    ].map((z) => ({
      ...z,
      share: zoneTotal > 0 ? (z.value / zoneTotal) * 100 : 0,
    })),
    reactive: {
      plus: zones.rPlus,
      minus: zones.rMinus,
      net: zones.rPlus - zones.rMinus,
    },
    topConsumers: [...withReading]
      .sort((a, b) => b.consumedKwh - a.consumedKwh)
      .slice(0, 5),
    problemTps: rows
      .filter((r) => r.consumersOffline > 0)
      .sort(
        (a, b) =>
          b.consumersOffline - a.consumersOffline ||
          b.offlineShare - a.offlineShare,
      )
      .slice(0, 5),
    negativeTps: withReading.filter((r) => r.difference < 0),
  };
}
