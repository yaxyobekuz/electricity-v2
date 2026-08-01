import Link from "next/link";
import { Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/calc";
import { formatNumber, formatPeriod } from "@/lib/format";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { saveFeeder } from "./actions";
import { FeederFilters } from "./feeder-filters";
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

export const metadata = { title: "Fiderlar — Electricity" };

export default async function FeedersPage({
  searchParams,
}: {
  searchParams: Promise<{ transformer?: string; q?: string }>;
}) {
  const params = await searchParams;
  const transformerId =
    params.transformer && params.transformer !== "all" ? params.transformer : null;
  const query = (params.q ?? "").trim();

  const [transformers, feeders] = await Promise.all([
    prisma.transformer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.feeder.findMany({
      where: {
        ...(transformerId ? { transformerId } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { aliases: { has: query } },
              ],
            }
          : {}),
      },
      orderBy: [{ transformer: { name: "asc" } }, { name: "asc" }],
      include: {
        transformer: { select: { id: true, name: true } },
        _count: { select: { tpPoints: true } },
        readings: { orderBy: { period: "desc" }, take: 1 },
        tpPoints: { select: { consumersTotal: true } },
      },
    }),
  ]);

  const totals = feeders.reduce(
    (acc, f) => ({
      tp: acc.tp + f._count.tpPoints,
      consumed: acc.consumed + toNumber(f.readings[0]?.consumedKwh),
      consumers:
        acc.consumers +
        f.tpPoints.reduce((s, tp) => s + (tp.consumersTotal ?? 0), 0),
    }),
    { tp: 0, consumed: 0, consumers: 0 },
  );

  const withoutTp = feeders.filter((f) => f._count.tpPoints === 0);

  return (
    <div className="flex flex-col gap-3">
      <PageHeading
        title="Fiderlar"
        description={`${feeders.length} ta 10 kV fider${
          query || transformerId ? " (filtrlangan)" : ""
        }`}
        action={
          <FeederFilters
            transformers={transformers}
            transformer={transformerId ?? "all"}
            query={query}
          />
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Fider soni" value={formatNumber(feeders.length)} />
        <StatCard label="Jami TP" value={formatNumber(totals.tp)} />
        <StatCard label="Jami abonent" value={formatNumber(totals.consumers)} />
        <StatCard
          label="Oxirgi iste'mol"
          value={formatNumber(totals.consumed)}
          hint="kVt·s"
        />
      </div>

      {transformers.length === 0 && (
        <Notice tone="warning" title="Ввод yo'q">
          Fider ввод&apos;ga biriktiriladi, ammo hali birorta ввод mavjud emas.
        </Notice>
      )}

      {withoutTp.length > 0 && (
        <Notice tone="warning">
          {withoutTp.length} ta fiderga TP biriktirilmagan (
          {withoutTp.map((f) => f.name).join(", ")}) — ularda elektr oqimi
          o&apos;lchanmaydi va tijoriy yo&apos;qotish hisoblanmaydi.
        </Notice>
      )}

      <Table>
        <thead>
          <tr>
            <Th>Nomi</Th>
            <Th>Ввод</Th>
            <Th align="right">Koef.</Th>
            <Th align="right">kV</Th>
            <Th align="right">TP</Th>
            <Th align="right">Abonent</Th>
            <Th>Oxirgi davr</Th>
            <Th align="right">Iste&apos;mol</Th>
            <Th>Muqobil nomlar</Th>
            <Th>{""}</Th>
          </tr>
        </thead>
        <tbody>
          {feeders.length === 0 ? (
            <EmptyRow colSpan={10}>
              {query || transformerId
                ? "Filtrga mos fider topilmadi."
                : "Fider yo'q. Pastdagi forma orqali qo'shing."}
            </EmptyRow>
          ) : (
            <>
              {feeders.map((feeder) => {
                const last = feeder.readings[0];
                const consumers = feeder.tpPoints.reduce(
                  (s, tp) => s + (tp.consumersTotal ?? 0),
                  0,
                );

                return (
                  <Tr key={feeder.id}>
                    <Td strong>{feeder.name}</Td>
                    <Td muted>{feeder.transformer.name}</Td>
                    <Td align="right" numeric>
                      {formatNumber(feeder.coefficient)}
                    </Td>
                    <Td align="right" numeric muted>
                      {feeder.voltage}
                    </Td>
                    <Td align="right" numeric>
                      {feeder._count.tpPoints === 0 ? (
                        <Badge tone="warning">0</Badge>
                      ) : (
                        feeder._count.tpPoints
                      )}
                    </Td>
                    <Td align="right" numeric>
                      {formatNumber(consumers)}
                    </Td>
                    <Td muted>{last ? formatPeriod(last.period) : "—"}</Td>
                    <Td align="right" numeric strong>
                      {formatNumber(last?.consumedKwh)}
                    </Td>
                    <Td muted>
                      {feeder.aliases.length > 0 ? feeder.aliases.join(", ") : "—"}
                    </Td>
                    <Td align="right">
                      <Link
                        href={`/feeders/${feeder.id}`}
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
                <Td>{""}</Td>
                <Td>{""}</Td>
                <Td align="right" numeric>
                  {formatNumber(totals.tp)}
                </Td>
                <Td align="right" numeric>
                  {formatNumber(totals.consumers)}
                </Td>
                <Td>{""}</Td>
                <Td align="right" numeric>
                  {formatNumber(totals.consumed)}
                </Td>
                <Td>{""}</Td>
                <Td>{""}</Td>
              </TotalRow>
            </>
          )}
        </tbody>
      </Table>

      {transformers.length > 0 && (
        <Card title="Yangi fider qo'shish">
          <ActionForm action={saveFeeder} className="flex flex-col gap-2">
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <Field label="Nomi">
                <Input name="name" placeholder="Paranda" required />
              </Field>

              <Field label="Ввод">
                <Select name="transformerId" required defaultValue="">
                  <option value="" disabled>
                    Tanlang
                  </option>
                  {transformers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Koeffitsient">
                <Input
                  name="coefficient"
                  inputMode="numeric"
                  placeholder="2000"
                  required
                />
              </Field>

              <Field label="Kuchlanish, kV">
                <Input name="voltage" inputMode="numeric" defaultValue="10" />
              </Field>

              <Field label="Muqobil nomlar" hint="Import uchun, vergul bilan">
                <Input name="aliases" placeholder="Парранда, Parranda" />
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
