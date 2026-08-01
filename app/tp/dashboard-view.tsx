import {
  Boxes,
  Gauge,
  Radio,
  TrendingUp,
  Users,
  WifiOff,
  Zap,
  ZapOff,
} from "lucide-react";

import { getTpDashboard } from "@/lib/tp-dashboard";
import { formatNumber, formatPeriod } from "@/lib/format";
import { BarList, DualBarList } from "@/components/dashboard/bar-list";
import { Donut, KpiCard, RankList } from "@/components/dashboard/widgets";
import { Card, Notice, Table, Td, Th, Tr } from "@/components/ui";

/**
 * Tab 1 — TP bo'limining dashboardi.
 * Barcha ko'rsatkichlar `lib/tp-dashboard.ts` da bitta so'rovdan hisoblanadi.
 */
export async function TpDashboardView({ period }: { period: Date | null }) {
  const data = await getTpDashboard(period);
  const { totals, byFeeder, byCoefficient, byMeterType, tariffs, reactive } =
    data;

  const zoneColors = [
    "var(--series-1)",
    "var(--series-2)",
    "var(--series-3)",
    "var(--series-4)",
  ];
  const zoneTotal = tariffs.reduce((s, t) => s + t.value, 0);

  if (totals.tpCount === 0) {
    return (
      <Notice tone="info" title="TP yo'q">
        Hali birorta transformator punkti qo&apos;shilmagan.{" "}
        <b>Ro&apos;yxat</b> tabidan qo&apos;shing yoki Excel import orqali
        yuklang.
      </Notice>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Asosiy ko'rsatkichlar ── */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Boxes}
          label="Jami TP"
          value={formatNumber(totals.tpCount)}
          hint={
            totals.withoutReading > 0
              ? `${formatNumber(totals.withoutReading)} tasida o'lchov yo'q`
              : "hammasida o'lchov bor"
          }
          accent={totals.withoutReading > 0 ? "warning" : "good"}
          delay={0}
        />
        <KpiCard
          icon={Users}
          label="Jami abonent"
          value={formatNumber(totals.consumers)}
          hint={`o'rtacha ${formatNumber(totals.consumers / totals.tpCount)} ta / TP`}
          delay={60}
        />
        <KpiCard
          icon={Radio}
          label="Aloqada"
          value={formatNumber(totals.online)}
          hint={`${formatNumber(totals.onlineShare)}%`}
          accent="good"
          progress={totals.onlineShare}
          delay={120}
        />
        <KpiCard
          icon={WifiOff}
          label="Aloqadan chiqqan"
          value={formatNumber(totals.offline)}
          hint={`${formatNumber(totals.offlineShare)}%`}
          accent={totals.offline > 0 ? "warning" : "neutral"}
          progress={totals.offlineShare}
          delay={180}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Zap}
          label="TP'lar iste'moli"
          value={formatNumber(totals.consumed)}
          unit="kVt·s"
          hint={period ? formatPeriod(period) : "davr yo'q"}
          accent="info"
          delay={0}
        />
        <KpiCard
          icon={TrendingUp}
          label="O'rtacha TP iste'moli"
          value={formatNumber(totals.averagePerTp)}
          unit="kVt·s"
          hint={`${formatNumber(totals.withReading)} ta o'lchov bo'yicha`}
          delay={60}
        />
        <KpiCard
          icon={Gauge}
          label="Abonentga o'rtacha"
          value={formatNumber(totals.perConsumer)}
          unit="kVt·s"
          delay={120}
        />
        <KpiCard
          icon={ZapOff}
          label="Manfiy farqli TP"
          value={formatNumber(data.negativeTps.length)}
          hint={
            data.negativeTps.length > 0
              ? "hisoblagich almashtirilgan bo'lishi mumkin"
              : "muammo yo'q"
          }
          accent={data.negativeTps.length > 0 ? "critical" : "good"}
          delay={180}
        />
      </div>

      {/* ── Iste'mol taqsimoti ── */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Fiderlar bo'yicha TP iste'moli">
            <BarList
              items={byFeeder
                .filter((f) => f.consumed > 0)
                .map((f) => ({
                  label: f.feederName,
                  value: f.consumed,
                  meta: `${f.tpCount} TP · ${formatNumber(f.consumers)} abonent`,
                  href: `/feeders/${f.feederId}`,
                }))}
              emptyText="O'lchov kiritilmagan."
            />
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Card title="Eng ko'p iste'mol qilgan TP">
            <RankList
              tone="critical"
              items={data.topConsumers.map((tp) => ({
                label: `TP ${tp.tpNumber}`,
                value: formatNumber(tp.consumedKwh),
                meta: tp.feederName,
                href: `/tp/${tp.id}`,
              }))}
            />
          </Card>

          <Card title="Muammoli TP — aloqadan chiqqan">
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
      </div>

      {/* ── Aloqa holati ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Fiderlar kesimida aloqa holati">
          <DualBarList
            items={byFeeder
              .filter((f) => f.consumers > 0)
              .map((f) => ({
                label: f.feederName,
                a: f.online,
                b: f.offline,
                href: `/feeders/${f.feederId}`,
              }))}
            labels={["Aloqada", "Aloqadan chiqqan"]}
          />
        </Card>

        <Card title="Tarif zonalari">
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
              Tarif ma&apos;lumoti yo&apos;q.
            </p>
          )}
        </Card>
      </div>

      {/* ── Uskunalar tahlili ── */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="Koeffitsient bo'yicha taqsimot">
          <Table>
            <thead>
              <tr>
                <Th align="right">Koef.</Th>
                <Th align="right">TP</Th>
                <Th align="right">Iste&apos;mol</Th>
              </tr>
            </thead>
            <tbody>
              {byCoefficient.map((c) => (
                <Tr key={c.coefficient}>
                  <Td align="right" numeric strong>
                    {formatNumber(c.coefficient)}
                  </Td>
                  <Td align="right" numeric>
                    {c.count}
                  </Td>
                  <Td align="right" numeric muted>
                    {formatNumber(c.consumed)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card title="Hisoblagich turlari">
          <Table>
            <thead>
              <tr>
                <Th>Turi</Th>
                <Th align="right">Soni</Th>
              </tr>
            </thead>
            <tbody>
              {byMeterType.map((m) => (
                <Tr key={m.type}>
                  <Td strong>{m.type}</Td>
                  <Td align="right" numeric>
                    {m.count}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card title="Reaktiv energiya">
          <div className="flex flex-col gap-2">
            <Figure label="R+ (induktiv)" value={formatNumber(reactive.plus)} />
            <Figure label="R− (kapasitiv)" value={formatNumber(reactive.minus)} />
            <Figure label="Balans" value={formatNumber(reactive.net)} />
          </div>
        </Card>
      </div>

      {/* ── Manfiy farqlar ── */}
      {data.negativeTps.length > 0 && (
        <Card title={`Manfiy farqli TP'lar (${data.negativeTps.length})`}>
          <Table>
            <thead>
              <tr>
                <Th>TP</Th>
                <Th>Fider</Th>
                <Th align="right">Farq</Th>
                <Th align="right">Koef.</Th>
                <Th>Hisoblagich</Th>
              </tr>
            </thead>
            <tbody>
              {data.negativeTps.map((tp) => (
                <Tr key={tp.id}>
                  <Td strong>{tp.tpNumber}</Td>
                  <Td muted>{tp.feederName}</Td>
                  <Td align="right" numeric>
                    <span className="text-red-600 dark:text-red-400">
                      {formatNumber(tp.difference)}
                    </span>
                  </Td>
                  <Td align="right" numeric muted>
                    {tp.coefficient}
                  </Td>
                  <Td muted>{tp.meterSerial ?? "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
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
