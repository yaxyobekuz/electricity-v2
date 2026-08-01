import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Gauge,
  Radio,
  ShieldAlert,
  TrendingDown,
  Upload,
  Users,
  WifiOff,
  Zap,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getAvailablePeriods } from "@/lib/reports";
import { getDashboardData, feederLossParts } from "@/lib/dashboard";
import { toNumber } from "@/lib/calc";
import { formatKva, formatNumber, formatPeriod } from "@/lib/format";
import { FeederTabs } from "@/components/dashboard/feeder-tabs";
import { BarList, DualBarList } from "@/components/dashboard/bar-list";
import {
  Donut,
  KpiCard,
  LossBars,
  RankList,
} from "@/components/dashboard/widgets";
import { Card, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ feeder?: string }>;
}) {
  const params = await searchParams;

  const [feeders, periods] = await Promise.all([
    prisma.feeder.findMany({
      orderBy: [{ transformer: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    getAvailablePeriods(),
  ]);

  const selectedId =
    params.feeder && feeders.some((f) => f.id === params.feeder)
      ? params.feeder
      : null;
  const selectedName = feeders.find((f) => f.id === selectedId)?.name;
  const period = periods[0] ?? null;

  if (!period) {
    return (
      <div className="flex flex-col gap-3">
        <Header
          feeders={feeders}
          selectedId={selectedId}
          subtitle="O'lchov ma'lumoti yo'q"
        />
        <Notice tone="info" title="Hali o'lchov kiritilmagan">
          <Link href="/import" className="underline">
            Excel import
          </Link>{" "}
          orqali hisobot yuklang yoki{" "}
          <Link href="/feeder-readings" className="underline">
            fider ko&apos;rsatkichlarini
          </Link>{" "}
          qo&apos;lda kiriting.
        </Notice>
      </div>
    );
  }

  const data = await getDashboardData(period, selectedId);
  const { energy, consumers, network, tariffs, reactive } = data;

  const tpPoints = await prisma.tpPoint.findMany({
    where: selectedId ? { feederId: selectedId } : {},
    select: {
      id: true,
      tpNumber: true,
      consumersOnline: true,
      consumersOffline: true,
      consumersTotal: true,
      readings: { where: { period }, select: { consumedKwh: true } },
    },
  });


  // Asosiy taqsimot: "Umumiy" da fiderlar, fider tanlansa TP'lar kesimi.
  const distribution = selectedId
    ? tpPoints
        .map((tp) => ({
          label: `TP ${tp.tpNumber}`,
          value: toNumber(tp.readings[0]?.consumedKwh),
          href: `/tp/${tp.id}`,
        }))
        .filter((i) => i.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 12)
    : data.rows
        .map((r) => ({
          label: r.feederName,
          value: r.consumedKwh ?? 0,
          meta: r.tpCount > 0 ? `${r.tpCount} TP` : "TP yo'q",
          href: `/feeders/${r.feederId}`,
        }))
        .filter((i) => i.value > 0)
        .sort((a, b) => b.value - a.value);

  const lossItems = data.rows
    .map((r) => {
      const parts = feederLossParts(r);
      return parts
        ? {
            label: r.feederName,
            technical: parts.technical,
            commercial: parts.commercial,
            href: `/feeders/${r.feederId}`,
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.commercial - a.commercial);

  // Faqat fider tanlanganda kerak — "Umumiy" da o'rniga energiya balansi turadi.
  const consumerBars = tpPoints
    .filter((tp) => (tp.consumersTotal ?? 0) > 0)
    .sort((a, b) => (b.consumersTotal ?? 0) - (a.consumersTotal ?? 0))
    .slice(0, 8)
    .map((tp) => ({
      label: `TP ${tp.tpNumber}`,
      a: tp.consumersOnline ?? 0,
      b: tp.consumersOffline ?? 0,
      href: `/tp/${tp.id}`,
    }));

  const zoneColors = [
    "var(--series-1)",
    "var(--series-2)",
    "var(--series-3)",
    "var(--series-4)",
  ];
  const zoneTotal = tariffs.reduce((s, t) => s + t.value, 0);

  return (
    <div className="flex flex-col gap-3">
      <Header
        feeders={feeders}
        selectedId={selectedId}
        subtitle={`${formatPeriod(period)} · ${
          selectedName ? `${selectedName} fideri` : `${feeders.length} fider`
        }`}
      />

      {/* ── Energiya KPI ── */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          icon={Zap}
          label="Oqib o'tgan energiya"
          value={formatNumber(energy.consumed)}
          unit="kVt·s"
          hint={`${formatNumber(energy.consumed / 1000)} MVt·s`}
          accent="info"
          delay={0}
        />
        <KpiCard
          icon={Gauge}
          label="Foydali oqim"
          value={energy.flowMeasured ? formatNumber(energy.flow) : "—"}
          unit={energy.flowMeasured ? "kVt·s" : undefined}
          hint={
            energy.flowMeasured
              ? `${formatNumber(energy.flowShare)}%`
              : "o'lchanmagan"
          }
          accent="good"
          progress={energy.flowMeasured ? energy.flowShare : undefined}
          delay={60}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Texnologik yo'qotish"
          value={formatNumber(energy.technical)}
          unit="kVt·s"
          hint={`${formatNumber(energy.technicalShare)}%`}
          accent="warning"
          progress={energy.technicalShare}
          delay={120}
        />
        <KpiCard
          icon={ShieldAlert}
          label="Tijoriy yo'qotish"
          value={energy.flowMeasured ? formatNumber(energy.commercial) : "—"}
          unit={energy.flowMeasured ? "kVt·s" : undefined}
          hint={
            energy.flowMeasured
              ? `${formatNumber(energy.commercialShare)}%`
              : "o'lchanmagan"
          }
          accent="critical"
          progress={energy.flowMeasured ? energy.commercialShare : undefined}
          delay={180}
        />
        <KpiCard
          icon={TrendingDown}
          label="Umumiy yo'qotish"
          value={energy.flowMeasured ? formatNumber(energy.totalLoss) : "—"}
          unit={energy.flowMeasured ? "kVt·s" : undefined}
          hint={
            energy.flowMeasured
              ? `${formatNumber(energy.totalLossShare)}%`
              : undefined
          }
          accent="critical"
          progress={energy.flowMeasured ? energy.totalLossShare : undefined}
          delay={240}
        />
      </div>

      {/* ── Abonent va tarmoq KPI ── */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Jami abonent"
          value={formatNumber(consumers.total)}
          hint={`${formatNumber(consumers.tpCount)} TP · ${formatNumber(consumers.meterCount)} hisoblagich`}
          delay={0}
        />
        <KpiCard
          icon={Radio}
          label="Aloqadagi abonentlar"
          value={formatNumber(consumers.online)}
          hint={`${formatNumber(consumers.onlineShare)}%`}
          accent="good"
          progress={consumers.onlineShare}
          delay={60}
        />
        <KpiCard
          icon={WifiOff}
          label="Aloqadan chiqqan"
          value={formatNumber(consumers.offline)}
          hint={`${formatNumber(consumers.offlineShare)}%`}
          accent={consumers.offline > 0 ? "warning" : "neutral"}
          progress={consumers.offlineShare}
          delay={120}
        />
        <KpiCard
          icon={Boxes}
          label="Transformator quvvati"
          value={formatNumber(network.totalCapacityKva)}
          unit="kVA"
          hint={network.voltageType ? `${network.voltageType} kV` : undefined}
          delay={180}
        />
      </div>

      {/* ── Fiderlar tahlili ── */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card
            title={
              selectedId
                ? "TP'lar bo'yicha iste'mol (eng yuqori 12 ta)"
                : "Fiderlar bo'yicha energiya oqimi"
            }
          >
            <BarList items={distribution} />
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Card title="Eng yuklangan">
            <RankList
              tone="critical"
              items={data.topFeeders.map((r) => ({
                label: r.feederName,
                value: formatNumber(r.consumedKwh),
                meta: `koef. ${r.coefficient}`,
                href: `/feeders/${r.feederId}`,
              }))}
            />
          </Card>
          <Card title="Eng kam yuklangan">
            <RankList
              tone="good"
              items={data.bottomFeeders.map((r) => ({
                label: r.feederName,
                value: formatNumber(r.consumedKwh),
                meta: `koef. ${r.coefficient}`,
                href: `/feeders/${r.feederId}`,
              }))}
            />
          </Card>
        </div>
      </div>

      {/* ── Yo'qotishlar strukturasi + Ввод taqsimoti ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Fiderlar kesimida yo'qotishlar">
          <LossBars
            items={lossItems}
            emptyText="Oqimi o'lchangan fider yo'q — TP biriktirilmagan."
          />
        </Card>

        <Card title="VVOD'lar bo'yicha taqsimot">
          <div className="viz flex flex-col gap-3">
            {network.transformers.map((t, index) => (
              <div key={t.id} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{t.name}</span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {formatKva(t.capacityKva)} · {t.feederCount} fider
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <div
                    className="mr-2 h-1.5 flex-1 overflow-hidden rounded-full"
                    style={{ background: "var(--viz-track)" }}
                    role="presentation"
                  >
                    <div
                      className="viz-bar h-full rounded-full"
                      style={{
                        width: `${t.share}%`,
                        background:
                          index === 0 ? "var(--series-1)" : "var(--series-2)",
                        animationDelay: `${index * 80}ms`,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-sm tabular-nums">
                    <span className="font-medium">
                      {formatNumber(t.consumedKwh)}
                    </span>
                    <span className="ml-1.5 text-xs text-zinc-500">
                      {formatNumber(t.share)}%
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Tariflar + muammoli TP ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Tarif zonalari bo'yicha iste'mol">
          {zoneTotal > 0 ? (
            <Donut
              parts={tariffs.map((t, i) => ({
                label: t.label,
                value: t.value,
                share: t.share,
                color: zoneColors[i],
              }))}
              centerLabel="kVt·s"
              centerValue={formatNumber(zoneTotal)}
            />
          ) : (
            <p className="py-8 text-center text-sm text-zinc-500">
              Tarif zonalari bo&apos;yicha ma&apos;lumot yo&apos;q.
            </p>
          )}
          <p className="mt-3 text-xs text-zinc-500">
            T1 — pik, T2 — yarim pik, T3 — tungi, T4 — qo&apos;shimcha zona.
            Qiymatlar hisoblagichning o&apos;z taqsimoti, koeffitsientga
            ko&apos;paytirilmagan.
          </p>
        </Card>

        <Card title="Muammoli TP'lar — aloqadan chiqqan abonentlar">
          <RankList
            tone="critical"
            items={data.problemTps.map((tp) => ({
              label: `TP ${tp.tpNumber}`,
              value: `${tp.consumersOffline} / ${tp.consumersTotal}`,
              meta: `${tp.feederName} · ${formatNumber(tp.offlineShare)}%`,
              href: `/tp/${tp.id}`,
            }))}
          />
        </Card>
      </div>

      {/* ── Reaktiv energiya + abonent kesimi ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Reaktiv energiya">
          <div className="grid grid-cols-3 gap-2">
            <Figure label="R+ (induktiv)" value={formatNumber(reactive.plus)} />
            <Figure label="R− (kapasitiv)" value={formatNumber(reactive.minus)} />
            <Figure label="Balans" value={formatNumber(reactive.net)} />
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Manba faylda bu ustunlar kVt·s birligida kelgan (R+/R−). Agar ular
            aslida kVAr·s bo&apos;lsa, shablonda birlikni aniqlashtirish kerak.
          </p>
        </Card>

        {selectedId ? (
          <Card title="TP'lar bo'yicha abonentlar">
            <DualBarList
              items={consumerBars}
              labels={["Aloqada", "Aloqadan chiqqan"]}
            />
          </Card>
        ) : (
          <Card title="Energiya balansi">
            <div className="viz flex flex-col gap-3">
              <BalanceRow
                label="Elektr oqimi (TP yig'indisi)"
                value={energy.flow}
                total={energy.measuredConsumed}
                color="var(--status-good)"
              />
              <BalanceRow
                label="Texnologik yo'qotish"
                value={energy.technical}
                total={energy.measuredConsumed}
                color="var(--status-warning)"
              />
              <BalanceRow
                label="Tijoriy yo'qotish"
                value={energy.commercial}
                total={energy.measuredConsumed}
                color="var(--status-critical)"
              />
              <p className="text-xs text-zinc-500">
                Uch qism {formatNumber(energy.measuredConsumed)} kVt·s ni
                to&apos;liq bo&apos;ladi — bu oqimi o&apos;lchangan fiderlar
                iste&apos;moli.
                {energy.unmeasuredConsumed > 0 && (
                  <>
                    {" "}
                    Yana {formatNumber(energy.unmeasuredConsumed)} kVt·s TP
                    biriktirilmagan fiderlarga to&apos;g&apos;ri keladi — ularda
                    oqim noma&apos;lum.
                  </>
                )}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function BalanceRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const share = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: color }}
          />
          {label}
        </span>
        <span className="shrink-0 text-sm tabular-nums">
          <span className="font-medium">{formatNumber(value)}</span>
          <span className="ml-1.5 text-xs text-zinc-500">
            {formatNumber(share)}%
          </span>
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: "var(--viz-track)" }}
        role="presentation"
      >
        <div
          className="viz-bar h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, share))}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-800">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 text-base font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}

function Header({
  feeders,
  selectedId,
  subtitle,
}: {
  feeders: { id: string; name: string }[];
  selectedId: string | null;
  subtitle: string;
}) {
  return (
    <div className="viz-fade rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-400 text-zinc-950">
            <Activity className="size-5" strokeWidth={2.5} />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Boshqaruv paneli
            </h2>
            <p className="text-xs text-zinc-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/feeders"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            <Gauge className="size-4" />
            Fiderlar
          </Link>
          <Link
            href="/import"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            <Upload className="size-4" />
            Import
          </Link>
        </div>
      </div>

      <div className="mt-2 border-t border-zinc-200 px-3 dark:border-zinc-800">
        <FeederTabs feeders={feeders} current={selectedId} />
      </div>
    </div>
  );
}
