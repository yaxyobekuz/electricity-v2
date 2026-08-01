import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/calc";
import { formatNumber, formatPeriod } from "@/lib/format";
import { ActionForm, DeleteButton, SubmitButton } from "@/components/action-form";
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
  StatCard,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [tp, feeders] = await Promise.all([
    prisma.tpPoint.findUnique({
      where: { id },
      include: {
        feeder: { select: { id: true, name: true } },
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
  const mismatch =
    tp.consumersTotal !== null &&
    tp.consumersOnline !== null &&
    tp.consumersOffline !== null &&
    tp.consumersOnline + tp.consumersOffline !== tp.consumersTotal;

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
        description={`${tp.feeder.name} fideri · koeffitsient ${tp.coefficient}`}
        action={
          <DeleteButton
            action={deleteTp}
            id={tp.id}
            confirmText={`TP "${tp.tpNumber}" va uning ${tp.readings.length} ta o'lchovi butunlay o'chiriladi. Davom etilsinmi?`}
          />
        }
      />

      {mismatch && (
        <Notice tone="danger" title="Abonent soni to'g'ri kelmayapti">
          Aloqada ({tp.consumersOnline}) + aloqadan chiqqan (
          {tp.consumersOffline}) = {tp.consumersOnline! + tp.consumersOffline!},
          lekin jami {tp.consumersTotal} deb kiritilgan.
        </Notice>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami abonent" value={formatNumber(tp.consumersTotal)} />
        <StatCard
          label="Aloqada"
          value={formatNumber(tp.consumersOnline)}
          tone="success"
        />
        <StatCard
          label="Aloqadan chiqqan"
          value={formatNumber(tp.consumersOffline)}
          tone={(tp.consumersOffline ?? 0) > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Oxirgi iste'mol"
          value={formatNumber(latest?.consumedKwh)}
          hint={latest ? formatPeriod(latest.period) : "o'lchov yo'q"}
        />
      </div>

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
              hint="Aloqada + chiqqan = jami bo'lishi kerak"
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
              <Input name="meterSerial" defaultValue={tp.meterSerial ?? ""} />
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
              <Th align="right">Jami abonent</Th>
              <Th align="right">Aloqada</Th>
              <Th align="right">Chiqqan</Th>
            </tr>
          </thead>
          <tbody>
            {tp.readings.length === 0 ? (
              <EmptyRow colSpan={9}>
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
                  </Tr>
                );
              })
            )}
          </tbody>
        </Table>

        <p className="mt-2 text-xs text-zinc-500">
          Yuqoridagi abonent sonlari TP kartochkasidagi <b>joriy</b> qiymat.
          Jadvaldagilar esa har oyning o&apos;z tarixi — Excel importdan keladi.
        </p>
      </Card>
    </div>
  );
}
