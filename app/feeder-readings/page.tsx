import { prisma } from "@/lib/prisma";
import { getAvailablePeriods } from "@/lib/reports";
import {
  currentPeriod,
  formatPeriodInput,
  parsePeriod,
  toPeriodOptions,
} from "@/lib/calc";
import { formatNumber, formatPeriod } from "@/lib/format";
import { PeriodSelect } from "@/components/period-select";
import { FeederReadingForm } from "./reading-form";
import { deleteFeederReading } from "./actions";
import {
  Badge,
  Button,
  Card,
  EmptyRow,
  Notice,
  PageHeading,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function FeederReadingsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const periods = await getAvailablePeriods();
  const selected =
    (params.period ? parsePeriod(params.period) : null) ??
    periods[0] ??
    currentPeriod();

  const [feeders, readings] = await Promise.all([
    prisma.feeder.findMany({
      orderBy: [{ transformer: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, coefficient: true },
    }),
    prisma.feederReading.findMany({
      where: { period: selected },
      orderBy: { feeder: { name: "asc" } },
      include: {
        feeder: {
          select: { name: true, transformer: { select: { name: true } } },
        },
      },
    }),
  ]);

  const missing = feeders.length - readings.length;

  return (
    <div className="flex flex-col gap-3">
      <PageHeading
        title="Fider ko'rsatkichlari"
        description={`${formatPeriod(selected)} — 10 kV fiderlarning oylik o'lchovi`}
        action={
          <PeriodSelect
            periods={
              toPeriodOptions(periods).includes(formatPeriodInput(selected))
                ? toPeriodOptions(periods)
                : [formatPeriodInput(selected), ...toPeriodOptions(periods)]
            }
            current={formatPeriodInput(selected)}
          />
        }
      />

      <Card title="Ko'rsatkich kiritish">
        <FeederReadingForm
          feeders={feeders}
          defaultPeriod={formatPeriodInput(selected)}
        />
      </Card>

      {missing > 0 && (
        <Notice tone="warning">
          {formatPeriod(selected)} davri uchun {feeders.length} ta fiderdan{" "}
          {missing} tasining ko&apos;rsatkichi hali kiritilmagan — umumiy hisobot
          to&apos;liq bo&apos;lmaydi.
        </Notice>
      )}

      <Table>
        <thead>
          <tr>
            <Th>Ввод</Th>
            <Th>Fider</Th>
            <Th align="right">Oldingi</Th>
            <Th align="right">Joriy</Th>
            <Th align="right">Farq</Th>
            <Th align="right">Koef.</Th>
            <Th align="right">Iste&apos;mol</Th>
            <Th>Holat</Th>
            <Th>{""}</Th>
          </tr>
        </thead>
        <tbody>
          {readings.length === 0 ? (
            <EmptyRow colSpan={9}>
              Bu davr uchun ko&apos;rsatkich kiritilmagan.
            </EmptyRow>
          ) : (
            readings.map((r) => (
              <Tr key={r.id}>
                <Td muted>{r.feeder.transformer.name}</Td>
                <Td strong>{r.feeder.name}</Td>
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
                <Td>
                  {r.isBaseline ? (
                    <Badge tone="info">boshlang&apos;ich</Badge>
                  ) : (
                    <Badge tone="success">hisoblangan</Badge>
                  )}
                </Td>
                <Td align="right">
                  <form action={deleteFeederReading}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" tone="danger">
                      O&apos;chirish
                    </Button>
                  </form>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
