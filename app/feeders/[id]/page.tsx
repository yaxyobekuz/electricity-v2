import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { computeLosses, toNumber } from "@/lib/calc";
import { formatNumber, formatPeriod } from "@/lib/format";
import { ActionForm, DeleteButton, SubmitButton } from "@/components/action-form";
import { deleteFeeder, saveFeeder } from "../actions";
import {
  Badge,
  Card,
  EmptyRow,
  Field,
  Input,
  PageHeading,
  Select,
  StatCard,
  Table,
  Td,
  Th,
  TotalRow,
  Tr,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function FeederDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [feeder, transformers] = await Promise.all([
    prisma.feeder.findUnique({
      where: { id },
      include: {
        transformer: {
          select: {
            id: true,
            name: true,
            substation: { select: { name: true } },
          },
        },
        readings: { orderBy: { period: "desc" } },
        tpPoints: {
          orderBy: { tpNumber: "asc" },
          include: { readings: { orderBy: { period: "desc" }, take: 1 } },
        },
      },
    }),
    prisma.transformer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!feeder) notFound();

  const latest = feeder.readings.find((r) => !r.isBaseline) ?? feeder.readings[0];

  // Har bir davr uchun TP yig'indisi — "elektr oqimi" shundan hisoblanadi.
  const tpIds = feeder.tpPoints.map((tp) => tp.id);
  const flowByPeriod = new Map<number, number>();

  if (tpIds.length > 0) {
    const grouped = await prisma.tpReading.groupBy({
      by: ["period"],
      where: { tpPointId: { in: tpIds } },
      _sum: { consumedKwh: true },
    });
    for (const g of grouped) {
      flowByPeriod.set(g.period.getTime(), toNumber(g._sum.consumedKwh));
    }
  }

  const flowMeasured = feeder.tpPoints.length > 0;
  const latestFlow = latest ? (flowByPeriod.get(latest.period.getTime()) ?? 0) : 0;

  const latestLosses =
    latest && !latest.isBaseline
      ? computeLosses({
          consumedKwh: toNumber(latest.consumedKwh),
          electricFlowKwh: latestFlow,
          technicalLossPercent: toNumber(latest.technicalLossPercent),
        })
      : null;


  const consumers = feeder.tpPoints.reduce(
    (s, tp) => s + (tp.consumersTotal ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/feeders"
        className="inline-flex w-fit items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="size-3.5" />
        Fiderlar ro&apos;yxati
      </Link>

      <PageHeading
        title={feeder.name}
        description={`${feeder.transformer.substation.name} · ${feeder.transformer.name} · ${feeder.voltage} kV`}
        action={
          <DeleteButton
            action={deleteFeeder}
            id={feeder.id}
            confirmText={`"${feeder.name}" fideri, unga ulangan ${feeder.tpPoints.length} ta TP va barcha o'lchovlar o'chiriladi. Davom etilsinmi?`}
          />
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Oxirgi iste'mol"
          value={formatNumber(latest?.consumedKwh)}
          hint={latest ? formatPeriod(latest.period) : "o'lchov yo'q"}
        />
        <StatCard
          label="Elektr oqimi"
          value={flowMeasured ? formatNumber(latestFlow) : "—"}
          hint={flowMeasured ? `${feeder.tpPoints.length} ta TP` : "TP yo'q"}
        />
        <StatCard
          label="Texnologik yo'qotish"
          value={formatNumber(latestLosses?.technicalLossKwh)}
          tone="warning"
        />
        <StatCard
          label="Tijoriy yo'qotish"
          value={
            flowMeasured ? formatNumber(latestLosses?.commercialLossKwh) : "—"
          }
          hint={flowMeasured ? undefined : "o'lchanmagan"}
          tone={(latestLosses?.commercialLossKwh ?? 0) < 0 ? "danger" : "warning"}
        />
        <StatCard label="Jami abonent" value={formatNumber(consumers)} />
      </div>

      <Card title="Fider ma'lumotlari">
        <ActionForm action={saveFeeder} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={feeder.id} />

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Nomi">
              <Input name="name" defaultValue={feeder.name} required />
            </Field>

            <Field label="Ввод">
              <Select name="transformerId" defaultValue={feeder.transformerId}>
                {transformers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Koeffitsient" hint="Farq shu songa ko'paytiriladi">
              <Input
                name="coefficient"
                defaultValue={feeder.coefficient}
                inputMode="numeric"
                required
              />
            </Field>

            <Field label="Kuchlanish, kV">
              <Input
                name="voltage"
                defaultValue={feeder.voltage}
                inputMode="numeric"
              />
            </Field>

            <div className="sm:col-span-2 lg:col-span-3">
              <Field
                label="Muqobil nomlar"
                hint="Excel import shu nomlar bo'yicha ham qidiradi, vergul bilan ajrating"
              >
                <Input
                  name="aliases"
                  defaultValue={feeder.aliases.join(", ")}
                  placeholder="Парранда, Parranda"
                />
              </Field>
            </div>

            <Field label="Izoh">
              <Input name="note" defaultValue={feeder.note ?? ""} />
            </Field>
          </div>

          <div>
            <SubmitButton>Saqlash</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card title={`Oylik o'lchovlar (${feeder.readings.length})`}>
        <Table>
          <thead>
            <tr>
              <Th>Davr</Th>
              <Th align="right">Oldingi</Th>
              <Th align="right">Joriy</Th>
              <Th align="right">Farq</Th>
              <Th align="right">Koef.</Th>
              <Th align="right">Iste&apos;mol</Th>
              <Th align="right">Elektr oqimi</Th>
              <Th align="right">Tijoriy yo&apos;qotish</Th>
              <Th>Holat</Th>
            </tr>
          </thead>
          <tbody>
            {feeder.readings.length === 0 ? (
              <EmptyRow colSpan={9}>
                Ko&apos;rsatkich yo&apos;q.{" "}
                <Link href="/feeder-readings" className="underline">
                  Fider ko&apos;rsatkichlari
                </Link>{" "}
                bo&apos;limida kiriting.
              </EmptyRow>
            ) : (
              feeder.readings.map((r) => {
                const flow = flowByPeriod.get(r.period.getTime()) ?? 0;
                const losses = r.isBaseline
                  ? null
                  : computeLosses({
                      consumedKwh: toNumber(r.consumedKwh),
                      electricFlowKwh: flow,
                      technicalLossPercent: toNumber(r.technicalLossPercent),
                    });

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
                      {formatNumber(r.difference)}
                    </Td>
                    <Td align="right" numeric muted>
                      {r.coefficient}
                    </Td>
                    <Td align="right" numeric strong>
                      {formatNumber(r.consumedKwh)}
                    </Td>
                    <Td align="right" numeric muted>
                      {flowMeasured ? formatNumber(flow) : "—"}
                    </Td>
                    <Td align="right" numeric>
                      {!flowMeasured || !losses ? (
                        "—"
                      ) : losses.commercialLossKwh < 0 ? (
                        <Badge tone="danger">
                          {formatNumber(losses.commercialLossKwh)}
                        </Badge>
                      ) : (
                        formatNumber(losses.commercialLossKwh)
                      )}
                    </Td>
                    <Td>
                      {r.isBaseline ? (
                        <Badge tone="info">boshlang&apos;ich</Badge>
                      ) : (
                        <Badge tone="success">hisoblangan</Badge>
                      )}
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </Table>
      </Card>

      <Card title={`Ulangan TP'lar (${feeder.tpPoints.length})`}>
        <Table>
          <thead>
            <tr>
              <Th>TP</Th>
              <Th align="right">Koef.</Th>
              <Th>Hisoblagich</Th>
              <Th align="right">Jami abonent</Th>
              <Th align="right">Aloqada</Th>
              <Th align="right">Chiqqan</Th>
              <Th align="right">Oxirgi iste&apos;mol</Th>
              <Th>{""}</Th>
            </tr>
          </thead>
          <tbody>
            {feeder.tpPoints.length === 0 ? (
              <EmptyRow colSpan={8}>
                TP biriktirilmagan — elektr oqimi o&apos;lchanmaydi.
              </EmptyRow>
            ) : (
              <>
                {feeder.tpPoints.map((tp) => (
                  <Tr key={tp.id}>
                    <Td strong>{tp.tpNumber}</Td>
                    <Td align="right" numeric muted>
                      {tp.coefficient}
                    </Td>
                    <Td muted>{tp.meterSerial ?? "—"}</Td>
                    <Td align="right" numeric>
                      {formatNumber(tp.consumersTotal)}
                    </Td>
                    <Td align="right" numeric muted>
                      {formatNumber(tp.consumersOnline)}
                    </Td>
                    <Td align="right" numeric>
                      {(tp.consumersOffline ?? 0) > 0 ? (
                        <Badge tone="warning">{tp.consumersOffline}</Badge>
                      ) : (
                        <span className="text-zinc-400">0</span>
                      )}
                    </Td>
                    <Td align="right" numeric>
                      {formatNumber(tp.readings[0]?.consumedKwh)}
                    </Td>
                    <Td align="right">
                      <Link
                        href={`/tp/${tp.id}`}
                        className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900 dark:decoration-zinc-600 dark:hover:decoration-zinc-100"
                      >
                        Boshqarish
                      </Link>
                    </Td>
                  </Tr>
                ))}
                <TotalRow>
                  <Td>Jami</Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                  <Td align="right" numeric>
                    {formatNumber(consumers)}
                  </Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                  <Td align="right" numeric>
                    {formatNumber(latestFlow)}
                  </Td>
                  <Td>{""}</Td>
                </TotalRow>
              </>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
