import Link from "next/link";
import {
  AlertTriangle,
  Gauge,
  ShieldAlert,
  Users,
  Zap,
  ZapOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getAvailablePeriods, getFeederReport } from "@/lib/reports";
import type { FeederReportRow } from "@/lib/reports";
import { toNumber } from "@/lib/calc";
import { formatNumber, formatPeriod } from "@/lib/format";
import { FeederTabs } from "@/components/dashboard/feeder-tabs";
import { BarList, DualBarList } from "@/components/dashboard/bar-list";
import { Card, Notice, Table, Td, Th, Tr } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Sarlavhali ko'rsatkich plitasi — ikonka + nom + katta son. */
function Tile({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  /** Faqat yo'qotish plitalarida — ikonka foni. Rang yolg'iz ma'no tashimaydi. */
  accent?: "warning" | "critical";
}) {
  const iconTone =
    accent === "critical"
      ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400"
      : accent === "warning"
        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";

  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <span className={`grid size-8 place-items-center rounded-lg ${iconTone}`}>
        <Icon className="size-4" />
      </span>
      <p className="mt-2.5 text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
        {unit && (
          <span className="ml-1 text-sm font-normal text-zinc-500">{unit}</span>
        )}
      </p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

/** Yo'qotish taqsimoti — status rangi HAR DOIM yorliq bilan birga keladi. */
function LossSplit({
  consumed,
  flow,
  technical,
  commercial,
  unmeasured,
}: {
  /** Faqat oqimi O'LCHANGAN fiderlar iste'moli — uch qism aynan shuni bo'ladi. */
  consumed: number;
  flow: number;
  technical: number;
  commercial: number;
  /** Oqimi o'lchanmagan fiderlar iste'moli — taqsimotga kirmaydi. */
  unmeasured: number;
}) {
  if (consumed <= 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        Elektr oqimi o&apos;lchanmagan — fiderga TP biriktirilmagan yoki
        o&apos;lchov yo&apos;q.
      </p>
    );
  }

  const parts = [
    { label: "Elektr oqimi", value: flow, color: "var(--status-good)" },
    { label: "Texnologik yo'qotish", value: technical, color: "var(--status-warning)" },
    { label: "Tijoriy yo'qotish", value: commercial, color: "var(--status-critical)" },
  ];

  return (
    <div className="viz flex flex-col gap-3">
      {parts.map((part) => {
        const share = (part.value / consumed) * 100;
        return (
          <div key={part.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: part.color }}
                />
                {part.label}
              </span>
              <span className="shrink-0 text-sm tabular-nums">
                <span className="font-medium">{formatNumber(part.value)}</span>
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
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(0, Math.min(100, share))}%`,
                  background: part.color,
                }}
              />
            </div>
          </div>
        );
      })}

      <p className="text-xs text-zinc-500">
        Uch qism {formatNumber(consumed)} kVt·s ni to&apos;liq bo&apos;ladi —
        bu <b>oqimi o&apos;lchangan</b> fiderlar iste&apos;moli.
        {unmeasured > 0 && (
          <>
            {" "}
            Yana {formatNumber(unmeasured)} kVt·s TP biriktirilmagan fiderlarga
            to&apos;g&apos;ri keladi; ularda oqim noma&apos;lum, shuning uchun
            taqsimotga kiritilmadi.
          </>
        )}
      </p>
    </div>
  );
}

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

  const period = periods[0] ?? null;

  if (!period) {
    return (
      <div className="flex flex-col gap-3">
        <DashboardHeader
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

  const report = await getFeederReport(period);

  // TP'lar — oxirgi davrdagi o'lchovi bilan. Bittada olib, kesimlarga bo'lamiz.
  const tpPoints = await prisma.tpPoint.findMany({
    where: selectedId ? { feederId: selectedId } : {},
    select: {
      id: true,
      tpNumber: true,
      feederId: true,
      consumersTotal: true,
      consumersOnline: true,
      consumersOffline: true,
      readings: { where: { period }, select: { consumedKwh: true } },
    },
  });

  const rows: FeederReportRow[] = selectedId
    ? report.rows.filter((r) => r.feederId === selectedId)
    : report.rows;

  const totals = selectedId
    ? rows.reduce(
        (acc, r) => ({
          consumedKwh: acc.consumedKwh + (r.consumedKwh ?? 0),
          electricFlowKwh: acc.electricFlowKwh + r.electricFlowKwh,
          technicalLossKwh: acc.technicalLossKwh + (r.technicalLossKwh ?? 0),
          commercialLossKwh: acc.commercialLossKwh + (r.commercialLossKwh ?? 0),
        }),
        {
          consumedKwh: 0,
          electricFlowKwh: 0,
          technicalLossKwh: 0,
          commercialLossKwh: 0,
        },
      )
    : report.totals;

  const flowMeasured = rows.some((r) => r.flowMeasured);

  // Taqsimot faqat oqimi o'lchangan fiderlar ustida quriladi — aks holda
  // uch qism yig'indisi butunni bermaydi va grafik yolg'on gapiradi.
  const measuredRows = rows.filter((r) => r.flowMeasured);
  const measured = measuredRows.reduce(
    (acc, r) => ({
      consumed: acc.consumed + (r.consumedKwh ?? 0),
      flow: acc.flow + r.electricFlowKwh,
      technical: acc.technical + (r.technicalLossKwh ?? 0),
      commercial: acc.commercial + (r.commercialLossKwh ?? 0),
    }),
    { consumed: 0, flow: 0, technical: 0, commercial: 0 },
  );
  const unmeasuredConsumed = totals.consumedKwh - measured.consumed;
  const consumers = tpPoints.reduce(
    (acc, tp) => ({
      total: acc.total + (tp.consumersTotal ?? 0),
      online: acc.online + (tp.consumersOnline ?? 0),
      offline: acc.offline + (tp.consumersOffline ?? 0),
    }),
    { total: 0, online: 0, offline: 0 },
  );

  const lossShare =
    totals.consumedKwh > 0
      ? (totals.commercialLossKwh / totals.consumedKwh) * 100
      : 0;

  // Asosiy grafik: "Umumiy" da fiderlar kesimi, fider tanlansa TP'lar kesimi.
  const distribution = selectedId
    ? tpPoints
        .map((tp) => ({
          label: `TP ${tp.tpNumber}`,
          value: toNumber(tp.readings[0]?.consumedKwh),
          href: `/tp/${tp.id}`,
        }))
        .filter((i) => i.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
    : rows
        .map((r) => ({
          label: r.feederName,
          value: r.consumedKwh ?? 0,
          meta: r.tpCount > 0 ? `${r.tpCount} TP` : "TP yo'q",
          href: `/feeders/${r.feederId}`,
        }))
        .filter((i) => i.value > 0)
        .sort((a, b) => b.value - a.value);

  // Abonentlar grafigi: fider yoki TP kesimida.
  const consumerBars = selectedId
    ? tpPoints
        .filter((tp) => (tp.consumersTotal ?? 0) > 0)
        .sort((a, b) => (b.consumersTotal ?? 0) - (a.consumersTotal ?? 0))
        .slice(0, 8)
        .map((tp) => ({
          label: `TP ${tp.tpNumber}`,
          a: tp.consumersOnline ?? 0,
          b: tp.consumersOffline ?? 0,
          href: `/tp/${tp.id}`,
        }))
    : rows
        .map((r) => {
          const own = tpPoints.filter((tp) => tp.feederId === r.feederId);
          return {
            label: r.feederName,
            a: own.reduce((s, tp) => s + (tp.consumersOnline ?? 0), 0),
            b: own.reduce((s, tp) => s + (tp.consumersOffline ?? 0), 0),
            href: `/feeders/${r.feederId}`,
          };
        })
        .filter((i) => i.a + i.b > 0)
        .sort((a, b) => b.a + b.b - (a.a + a.b))
        .slice(0, 8);

  const invalid = rows.filter((r) => r.flowExceedsConsumption);
  const selectedName = feeders.find((f) => f.id === selectedId)?.name;

  return (
    <div className="flex flex-col gap-3">
      <DashboardHeader
        feeders={feeders}
        selectedId={selectedId}
        subtitle={`${formatPeriod(period)} · ${
          selectedName ? `${selectedName} fideri` : `${feeders.length} fider`
        }`}
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          icon={Zap}
          label="Iste'mol"
          value={formatNumber(totals.consumedKwh)}
          unit="kVt·s"
          hint="fider hisoblagichi bo'yicha"
        />
        <Tile
          icon={Gauge}
          label="Elektr oqimi"
          value={flowMeasured ? formatNumber(totals.electricFlowKwh) : "—"}
          unit={flowMeasured ? "kVt·s" : undefined}
          hint={flowMeasured ? "TP hisoblagichlari yig'indisi" : "o'lchanmagan"}
        />
        <Tile
          icon={AlertTriangle}
          label="Texnologik yo'qotish"
          value={formatNumber(totals.technicalLossKwh)}
          unit="kVt·s"
          hint="iste'molning 12%"
          accent="warning"
        />
        <Tile
          icon={ShieldAlert}
          label="Tijoriy yo'qotish"
          value={flowMeasured ? formatNumber(totals.commercialLossKwh) : "—"}
          unit={flowMeasured ? "kVt·s" : undefined}
          hint={
            flowMeasured
              ? `iste'molning ${formatNumber(lossShare)}%`
              : "oqimsiz hisoblanmaydi"
          }
          accent="critical"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="Qamrov">
          <div className="flex flex-col gap-3">
            <Figure label="Fiderlar" value={formatNumber(rows.length)} />
            <Figure label="TP" value={formatNumber(tpPoints.length)} />
            <Figure
              label="Abonentlar"
              value={formatNumber(consumers.total)}
              hint={`${formatNumber(consumers.online)} aloqada`}
            />
            <Figure
              label="Aloqadan chiqqan"
              value={formatNumber(consumers.offline)}
              hint={
                consumers.total > 0
                  ? `${formatNumber((consumers.offline / consumers.total) * 100)}%`
                  : undefined
              }
            />
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card
            title={
              selectedId
                ? "TP'lar bo'yicha iste'mol (eng yuqori 10 ta)"
                : "Fiderlar bo'yicha iste'mol"
            }
          >
            <BarList items={distribution} />
          </Card>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Energiya taqsimoti">
          <LossSplit
            consumed={measured.consumed}
            flow={measured.flow}
            technical={measured.technical}
            commercial={measured.commercial}
            unmeasured={unmeasuredConsumed}
          />
        </Card>

        <Card title="Abonentlar">
          <DualBarList
            items={consumerBars}
            labels={["Aloqada", "Aloqadan chiqqan"]}
          />
        </Card>
      </div>

      {!selectedId && (
        <Card title="Fiderlar jadvali">
          <Table>
            <thead>
              <tr>
                <Th>Fider</Th>
                <Th align="right">Iste&apos;mol</Th>
                <Th align="right">Elektr oqimi</Th>
                <Th align="right">Tijoriy yo&apos;qotish</Th>
                <Th align="right">TP</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Tr key={row.feederId}>
                  <Td strong>
                    <Link
                      href={`/?feeder=${row.feederId}`}
                      className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900 dark:decoration-zinc-600 dark:hover:decoration-zinc-100"
                    >
                      {row.feederName}
                    </Link>
                  </Td>
                  <Td align="right" numeric>
                    {formatNumber(row.consumedKwh)}
                  </Td>
                  <Td align="right" numeric muted>
                    {row.flowMeasured ? formatNumber(row.electricFlowKwh) : "—"}
                  </Td>
                  <Td align="right" numeric>
                    {row.commercialLossKwh === null
                      ? "—"
                      : formatNumber(row.commercialLossKwh)}
                  </Td>
                  <Td align="right" numeric muted>
                    {row.tpCount}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-semibold tracking-tight tabular-nums">
        {value}
        {hint && (
          <span className="ml-1.5 text-xs font-normal text-zinc-500">
            {hint}
          </span>
        )}
      </p>
    </div>
  );
}

function DashboardHeader({
  feeders,
  selectedId,
  subtitle,
}: {
  feeders: { id: string; name: string }[];
  selectedId: string | null;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-400 text-zinc-950">
            <ZapOff className="size-5" strokeWidth={2.5} />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Boshqaruv paneli
            </h2>
            <p className="text-xs text-zinc-500">{subtitle}</p>
          </div>
        </div>

        <Link
          href="/import"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
        >
          <Users className="size-4" />
          Excel import
        </Link>
      </div>

      <div className="mt-2 border-t border-zinc-200 px-3 dark:border-zinc-800">
        <FeederTabs feeders={feeders} current={selectedId} />
      </div>
    </div>
  );
}
