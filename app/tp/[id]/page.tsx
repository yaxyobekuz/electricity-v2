import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Radio,
  Users,
  WifiOff,
  Zap,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/calc";
import { formatKva, formatNumber, formatPeriod } from "@/lib/format";
import { PageTabs } from "@/components/page-tabs";
import type { TabIcon } from "@/components/page-tabs";
import { ActionForm, DeleteButton, SubmitButton } from "@/components/action-form";
import { BarList } from "@/components/dashboard/bar-list";
import { Donut, KpiCard } from "@/components/dashboard/widgets";
import { deleteTp, saveTp } from "../actions";
import {
  Badge,
  Card,
  EmptyRow,
  Field,
  Input,
  Notice,
  PageHeading,
  Select,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const TABS: { id: string; label: string; icon: TabIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "settings", label: "Sozlamalar va ma'lumotlar", icon: "settings" },
];

/** Hisob-kitobning bitta qatori — formula shaffof ko'rinishi uchun. */
function CalcRow({
  label,
  value,
  operator,
  strong = false,
  divider = false,
}: {
  label: string;
  value: string;
  operator?: string;
  strong?: boolean;
  divider?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-1 ${
        divider ? "border-t border-zinc-300 dark:border-zinc-700" : ""
      }`}
    >
      <span
        className={`text-sm ${strong ? "font-medium" : "text-zinc-600 dark:text-zinc-400"}`}
      >
        {operator && (
          <span className="mr-1 inline-block w-3 text-zinc-400">{operator}</span>
        )}
        {label}
      </span>
      <span
        className={`tabular-nums ${strong ? "text-base font-semibold" : "text-sm"}`}
      >
        {value}
      </span>
    </div>
  );
}

export default async function TpDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const tab = query.tab === "settings" ? "settings" : "dashboard";

  const [tp, feeders] = await Promise.all([
    prisma.tpPoint.findUnique({
      where: { id },
      include: {
        feeder: { select: { id: true, name: true, coefficient: true } },
        readings: { orderBy: { period: "desc" } },
      },
    }),
    prisma.feeder.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!tp) notFound();

  const latest = tp.readings[0];

  // Shu fiderdagi boshqa TP'lar — ulush va reyting uchun.
  const siblings = latest
    ? await prisma.tpReading.findMany({
        where: { period: latest.period, tpPoint: { feederId: tp.feederId } },
        select: {
          consumedKwh: true,
          tpPoint: { select: { id: true, tpNumber: true } },
        },
      })
    : [];

  const feederFlow = siblings.reduce((s, r) => s + toNumber(r.consumedKwh), 0);
  const own = toNumber(latest?.consumedKwh);
  const share = feederFlow > 0 ? (own / feederFlow) * 100 : 0;

  const ranked = [...siblings].sort(
    (a, b) => toNumber(b.consumedKwh) - toNumber(a.consumedKwh),
  );
  const rank = ranked.findIndex((r) => r.tpPoint.id === tp.id) + 1;

  const mismatch =
    tp.consumersTotal !== null &&
    tp.consumersOnline !== null &&
    tp.consumersOffline !== null &&
    tp.consumersOnline + tp.consumersOffline !== tp.consumersTotal;

  const onlineShare =
    (tp.consumersTotal ?? 0) > 0
      ? ((tp.consumersOnline ?? 0) / (tp.consumersTotal ?? 1)) * 100
      : 0;
  const offlineShare =
    (tp.consumersTotal ?? 0) > 0
      ? ((tp.consumersOffline ?? 0) / (tp.consumersTotal ?? 1)) * 100
      : 0;

  const zones = latest
    ? [
        { label: "T1", value: toNumber(latest.zoneT1) },
        { label: "T2", value: toNumber(latest.zoneT2) },
        { label: "T3", value: toNumber(latest.zoneT3) },
        { label: "T4", value: toNumber(latest.zoneT4) },
      ]
    : [];
  const zoneTotal = zones.reduce((s, z) => s + z.value, 0);
  const zoneColors = [
    "var(--series-1)",
    "var(--series-2)",
    "var(--series-3)",
    "var(--series-4)",
  ];

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/tp"
        className="inline-flex w-fit items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="size-3.5" />
        TP&apos;lar ro&apos;yxati
      </Link>

      <PageHeading
        title={`TP ${tp.tpNumber}`}
        description={`${tp.feeder.name} fideri · koeffitsient ${tp.coefficient}${
          latest ? ` · ${formatPeriod(latest.period)}` : ""
        }`}
        action={
          <DeleteButton
            action={deleteTp}
            id={tp.id}
            confirmText={`TP "${tp.tpNumber}" va uning ${tp.readings.length} ta o'lchovi butunlay o'chiriladi. Davom etilsinmi?`}
          />
        }
      />

      <PageTabs tabs={TABS} current={tab} />

      {tab === "dashboard" ? (
        <div className="flex flex-col gap-3">
          {/* ── Asosiy ko'rsatkichlar ── */}
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={Zap}
              label="Oxirgi iste'mol"
              value={formatNumber(own)}
              unit="kVt·s"
              hint={latest ? formatPeriod(latest.period) : "o'lchov yo'q"}
              accent="info"
              delay={0}
            />
            <KpiCard
              icon={Users}
              label="Jami abonent"
              value={formatNumber(tp.consumersTotal)}
              hint={
                (tp.consumersTotal ?? 0) > 0
                  ? `${formatNumber(own / (tp.consumersTotal ?? 1))} kVt·s / abonent`
                  : undefined
              }
              delay={60}
            />
            <KpiCard
              icon={Radio}
              label="Aloqada"
              value={formatNumber(tp.consumersOnline)}
              hint={`${formatNumber(onlineShare)}%`}
              accent="good"
              progress={onlineShare}
              delay={120}
            />
            <KpiCard
              icon={WifiOff}
              label="Aloqadan chiqqan"
              value={formatNumber(tp.consumersOffline)}
              hint={`${formatNumber(offlineShare)}%`}
              accent={(tp.consumersOffline ?? 0) > 0 ? "warning" : "neutral"}
              progress={offlineShare}
              delay={180}
            />
          </div>

          {mismatch && (
            <Notice tone="danger" title="Abonent soni to'g'ri kelmayapti">
              Aloqada ({tp.consumersOnline}) + aloqadan chiqqan (
              {tp.consumersOffline}) ={" "}
              {(tp.consumersOnline ?? 0) + (tp.consumersOffline ?? 0)}, lekin
              jami {tp.consumersTotal} deb kiritilgan.
            </Notice>
          )}

          {/* ── Hisob-kitob va fiderdagi o'rni ── */}
          <div className="grid gap-3 lg:grid-cols-2">
            <Card
              title={
                latest
                  ? `Hisob-kitob — ${formatPeriod(latest.period)}`
                  : "Hisob-kitob"
              }
            >
              {!latest ? (
                <p className="py-6 text-center text-sm text-zinc-500">
                  O&apos;lchov kiritilmagan.
                </p>
              ) : (
                <div className="flex flex-col">
                  <CalcRow
                    label="Joriy ko'rsatkich"
                    value={formatNumber(latest.meterValue)}
                  />
                  <CalcRow
                    label="Oldingi ko'rsatkich"
                    value={formatNumber(latest.previousValue)}
                    operator="−"
                  />
                  <CalcRow
                    label="Farq"
                    value={formatNumber(latest.difference)}
                    divider
                  />
                  <CalcRow
                    label="Koeffitsient"
                    value={formatNumber(latest.coefficient)}
                    operator="×"
                  />
                  <CalcRow
                    label="Bir oylik iste'mol, kVt·s"
                    value={formatNumber(latest.consumedKwh)}
                    strong
                    divider
                  />
                  {latest.isBaseline && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Boshlang&apos;ich o&apos;lchov — oldingi ko&apos;rsatkich
                      noma&apos;lum, iste&apos;mol hisoblanmadi.
                    </p>
                  )}
                </div>
              )}
            </Card>

            <Card title={`${tp.feeder.name} fideridagi o'rni`}>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <Figure
                    label="Fider oqimidagi ulushi"
                    value={feederFlow > 0 ? `${formatNumber(share)}%` : "—"}
                  />
                  <Figure
                    label="Reyting"
                    value={
                      rank > 0 ? `${rank} / ${siblings.length}` : "—"
                    }
                  />
                </div>

                <BarList
                  items={ranked.slice(0, 5).map((r) => ({
                    label:
                      r.tpPoint.id === tp.id
                        ? `TP ${r.tpPoint.tpNumber} (shu TP)`
                        : `TP ${r.tpPoint.tpNumber}`,
                    value: toNumber(r.consumedKwh),
                    href: `/tp/${r.tpPoint.id}`,
                  }))}
                  emptyText="Fiderda boshqa TP yo'q."
                />
              </div>
            </Card>
          </div>

          {/* ── Tarif zonalari va reaktiv ── */}
          <div className="grid gap-3 lg:grid-cols-2">
            <Card title="Tarif zonalari">
              {zoneTotal > 0 ? (
                <Donut
                  parts={zones.map((z, i) => ({
                    label: z.label,
                    value: z.value,
                    share: (z.value / zoneTotal) * 100,
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
              <p className="mt-3 text-xs text-zinc-500">
                Bu hisoblagichning o&apos;z taqsimoti — koeffitsientga
                ko&apos;paytirilmagan, shuning uchun bir oylik iste&apos;mol
                bilan bevosita solishtirilmaydi.
              </p>
            </Card>

            <Card title="Reaktiv energiya va uskuna">
              <div className="grid grid-cols-2 gap-2">
                <Figure
                  label="R+ (induktiv)"
                  value={formatNumber(latest?.reactivePlus)}
                />
                <Figure
                  label="R− (kapasitiv)"
                  value={formatNumber(latest?.reactiveMinus)}
                />
                <Figure
                  label="Hisoblagich turi"
                  value={tp.meterType ?? "—"}
                />
                <Figure
                  label="Hisoblagich raqami"
                  value={tp.meterSerial ?? "—"}
                />
                <Figure
                  label="Koeffitsient"
                  value={formatNumber(tp.coefficient)}
                />
                <Figure
                  label="Quvvat"
                  value={tp.capacityKva ? formatKva(tp.capacityKva) : "—"}
                />
              </div>
            </Card>
          </div>

          {/* ── Iste'mol dinamikasi ── */}
          <Card title={`Iste'mol dinamikasi (${tp.readings.length} davr)`}>
            <BarList
              items={[...tp.readings]
                .reverse()
                .filter((r) => !r.isBaseline)
                .map((r) => ({
                  label: formatPeriod(r.period),
                  value: toNumber(r.consumedKwh),
                  meta: `farq ${formatNumber(r.difference)}`,
                }))}
              emptyText="Hisoblangan davr yo'q — faqat boshlang'ich o'lchov bor."
            />
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* ── Sozlamalar ── */}
          <Card title="TP ma'lumotlari">
            <ActionForm action={saveTp} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={tp.id} />

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="TP raqami (ID)">
                  <Input name="tpNumber" defaultValue={tp.tpNumber} required />
                </Field>

                <Field label="Fider">
                  <Select name="feederId" defaultValue={tp.feederId}>
                    {feeders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Koeffitsient" hint="Farq shu songa ko'paytiriladi">
                  <Input
                    name="coefficient"
                    defaultValue={tp.coefficient}
                    inputMode="numeric"
                    required
                  />
                </Field>

                <Field label="Quvvat, kVA">
                  <Input
                    name="capacityKva"
                    defaultValue={tp.capacityKva ?? ""}
                    inputMode="numeric"
                    placeholder="ixtiyoriy"
                  />
                </Field>

                <Field label="Jami abonent">
                  <Input
                    name="consumersTotal"
                    defaultValue={tp.consumersTotal ?? ""}
                    inputMode="numeric"
                  />
                </Field>

                <Field label="Aloqada">
                  <Input
                    name="consumersOnline"
                    defaultValue={tp.consumersOnline ?? ""}
                    inputMode="numeric"
                  />
                </Field>

                <Field
                  label="Aloqadan chiqqan"
                  hint="Aloqada + chiqqan = jami"
                >
                  <Input
                    name="consumersOffline"
                    defaultValue={tp.consumersOffline ?? ""}
                    inputMode="numeric"
                  />
                </Field>

                <Field label="Hisoblagich turi">
                  <Input name="meterType" defaultValue={tp.meterType ?? ""} />
                </Field>

                <Field label="Hisoblagich raqami">
                  <Input
                    name="meterSerial"
                    defaultValue={tp.meterSerial ?? ""}
                  />
                </Field>

                <div className="sm:col-span-2 lg:col-span-3">
                  <Field label="Manzil">
                    <Input name="address" defaultValue={tp.address ?? ""} />
                  </Field>
                </div>
              </div>

              <div>
                <SubmitButton>Saqlash</SubmitButton>
              </div>
            </ActionForm>
          </Card>

          {/* ── O'lchovlar tarixi ── */}
          <Card title={`Oylik o'lchovlar (${tp.readings.length})`}>
            <Table>
              <thead>
                <tr>
                  <Th>Davr</Th>
                  <Th align="right">Oldingi</Th>
                  <Th align="right">Joriy</Th>
                  <Th align="right">Farq</Th>
                  <Th align="right">Koef.</Th>
                  <Th align="right">Iste&apos;mol</Th>
                  <Th align="right">Abonent</Th>
                  <Th align="right">Aloqada</Th>
                  <Th align="right">Chiqqan</Th>
                  <Th align="right">T1</Th>
                  <Th align="right">T2</Th>
                  <Th align="right">T3</Th>
                  <Th align="right">T4</Th>
                  <Th align="right">R+</Th>
                  <Th align="right">R−</Th>
                </tr>
              </thead>
              <tbody>
                {tp.readings.length === 0 ? (
                  <EmptyRow colSpan={15}>
                    O&apos;lchov yo&apos;q. Excel import orqali yuklanadi.
                  </EmptyRow>
                ) : (
                  tp.readings.map((r) => {
                    const diff = toNumber(r.difference);
                    return (
                      <Tr key={r.id}>
                        <Td strong>{formatPeriod(r.period)}</Td>
                        <Td align="right" numeric muted>
                          {formatNumber(r.previousValue)}
                        </Td>
                        <Td align="right" numeric>
                          {formatNumber(r.meterValue)}
                        </Td>
                        <Td align="right" numeric>
                          {diff < 0 ? (
                            <Badge tone="danger">{formatNumber(diff)}</Badge>
                          ) : (
                            formatNumber(diff)
                          )}
                        </Td>
                        <Td align="right" numeric muted>
                          {r.coefficient}
                        </Td>
                        <Td align="right" numeric strong>
                          {formatNumber(r.consumedKwh)}
                        </Td>
                        <Td align="right" numeric>
                          {formatNumber(r.consumersTotal)}
                        </Td>
                        <Td align="right" numeric muted>
                          {formatNumber(r.consumersOnline)}
                        </Td>
                        <Td align="right" numeric>
                          {(r.consumersOffline ?? 0) > 0 ? (
                            <Badge tone="warning">{r.consumersOffline}</Badge>
                          ) : (
                            <span className="text-zinc-400">0</span>
                          )}
                        </Td>
                        <Td align="right" numeric muted>
                          {formatNumber(r.zoneT1)}
                        </Td>
                        <Td align="right" numeric muted>
                          {formatNumber(r.zoneT2)}
                        </Td>
                        <Td align="right" numeric muted>
                          {formatNumber(r.zoneT3)}
                        </Td>
                        <Td align="right" numeric muted>
                          {formatNumber(r.zoneT4)}
                        </Td>
                        <Td align="right" numeric muted>
                          {formatNumber(r.reactivePlus)}
                        </Td>
                        <Td align="right" numeric muted>
                          {formatNumber(r.reactiveMinus)}
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-800">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}
