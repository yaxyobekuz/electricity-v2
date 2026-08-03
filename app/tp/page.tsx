import Link from "next/link";
import { Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatNumber } from "@/lib/format";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { saveTp } from "./actions";
import { TpFilters } from "./tp-filters";
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
  TotalRow,
  Tr,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "TP'lar — Electricity" };

export default async function TpPage({
  searchParams,
}: {
  searchParams: Promise<{ feeder?: string; q?: string }>;
}) {
  const params = await searchParams;
  const feederId = params.feeder && params.feeder !== "all" ? params.feeder : null;
  const query = (params.q ?? "").trim();

  const [feeders, tpPoints] = await Promise.all([
    prisma.feeder.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, coefficient: true },
    }),
    prisma.tpPoint.findMany({
      where: {
        ...(feederId ? { feederId } : {}),
        ...(query
          ? {
              OR: [
                { tpNumber: { contains: query, mode: "insensitive" as const } },
                { meterSerial: { contains: query, mode: "insensitive" as const } },
                { address: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ feeder: { name: "asc" } }, { tpNumber: "asc" }],
      include: { feeder: { select: { id: true, name: true } } },
    }),
  ]);

  const totals = tpPoints.reduce(
    (acc, tp) => ({
      total: acc.total + (tp.consumersTotal ?? 0),
      online: acc.online + (tp.consumersOnline ?? 0),
      offline: acc.offline + (tp.consumersOffline ?? 0),
    }),
    { total: 0, online: 0, offline: 0 },
  );

  return (
    <div className="flex flex-col gap-3">
      <PageHeading
        title="TP'lar"
        description={`${tpPoints.length} ta transformator punkti${
          query || feederId ? " (filtrlangan)" : ""
        }`}
        action={<TpFilters feeders={feeders} feeder={feederId ?? "all"} query={query} />}
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="TP soni" value={formatNumber(tpPoints.length)} />
        <StatCard label="Jami abonent" value={formatNumber(totals.total)} />
        <StatCard label="Aloqada" value={formatNumber(totals.online)} tone="success" />
        <StatCard
          label="Aloqadan chiqqan"
          value={formatNumber(totals.offline)}
          tone={totals.offline > 0 ? "warning" : "neutral"}
        />
      </div>

      {feeders.length === 0 && (
        <Notice tone="warning" title="Fider yo'q">
          TP fiderga biriktiriladi, ammo hali birorta fider mavjud emas.
        </Notice>
      )}

      <Table>
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>Fider</Th>
            <Th align="right">Jami</Th>
            <Th align="right">Aloqada</Th>
            <Th align="right">Chiqqan</Th>
            <Th align="right">Koef.</Th>
            <Th>Hisoblagich</Th>
            <Th>Manzil</Th>
            <Th>{""}</Th>
          </tr>
        </thead>
        <tbody>
          {tpPoints.length === 0 ? (
            <EmptyRow colSpan={9}>
              {query || feederId
                ? "Filtrga mos TP topilmadi."
                : "TP yo'q. Pastdagi forma orqali qo'shing."}
            </EmptyRow>
          ) : (
            <>
              {tpPoints.map((tp) => {
                const offline = tp.consumersOffline ?? 0;
                // Qismlar jamiga to'g'ri kelmasa — ma'lumot noaniq.
                const mismatch =
                  tp.consumersTotal !== null &&
                  tp.consumersOnline !== null &&
                  tp.consumersOffline !== null &&
                  tp.consumersOnline + tp.consumersOffline !== tp.consumersTotal;

                return (
                  <Tr key={tp.id}>
                    <Td strong>{tp.tpNumber}</Td>
                    <Td muted>{tp.feeder.name}</Td>
                    <Td align="right" numeric strong>
                      {mismatch ? (
                        <Badge tone="danger">{formatNumber(tp.consumersTotal)}</Badge>
                      ) : (
                        formatNumber(tp.consumersTotal)
                      )}
                    </Td>
                    <Td align="right" numeric>
                      {formatNumber(tp.consumersOnline)}
                    </Td>
                    <Td align="right" numeric>
                      {offline > 0 ? (
                        <Badge tone="warning">{offline}</Badge>
                      ) : (
                        <span className="text-zinc-400">0</span>
                      )}
                    </Td>
                    <Td align="right" numeric muted>
                      {formatNumber(tp.coefficient)}
                    </Td>
                    <Td muted>{tp.meterSerial ?? "—"}</Td>
                    <Td muted>{tp.address ?? "—"}</Td>
                    <Td align="right">
                      <Link
                        href={`/tp/${tp.id}`}
                        className="font-medium underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900 dark:decoration-zinc-600 dark:hover:decoration-zinc-100"
                      >
                        Boshqarish
                      </Link>
                    </Td>
                  </Tr>
                );
              })}

              <TotalRow>
                <Td>Jami</Td>
                <Td>{""}</Td>
                <Td align="right" numeric>
                  {formatNumber(totals.total)}
                </Td>
                <Td align="right" numeric>
                  {formatNumber(totals.online)}
                </Td>
                <Td align="right" numeric>
                  {formatNumber(totals.offline)}
                </Td>
                <Td>{""}</Td>
                <Td>{""}</Td>
                <Td>{""}</Td>
                <Td>{""}</Td>
              </TotalRow>
            </>
          )}
        </tbody>
      </Table>

      {feeders.length > 0 && (
        <Card title="Yangi TP qo'shish">
          <ActionForm action={saveTp} className="flex flex-col gap-2">
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <Field label="TP raqami (ID)">
                <Input name="tpNumber" placeholder="23" required />
              </Field>

              <Field label="Fider">
                <Select name="feederId" required defaultValue="">
                  <option value="" disabled>
                    Tanlang
                  </option>
                  {feeders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Koeffitsient">
                <Input name="coefficient" inputMode="numeric" placeholder="60" required />
              </Field>

              <Field label="Hisoblagich raqami">
                <Input name="meterSerial" placeholder="124200518951" />
              </Field>

              <Field label="Jami abonent">
                <Input name="consumersTotal" inputMode="numeric" placeholder="64" />
              </Field>

              <Field label="Aloqada">
                <Input name="consumersOnline" inputMode="numeric" placeholder="63" />
              </Field>

              <Field label="Aloqadan chiqqan">
                <Input name="consumersOffline" inputMode="numeric" placeholder="1" />
              </Field>

              <Field label="Manzil">
                <Input name="address" placeholder="ixtiyoriy" />
              </Field>
            </div>

            <div>
              <SubmitButton>
                <Plus className="size-4" />
                Qo&apos;shish
              </SubmitButton>
            </div>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
