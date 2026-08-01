import { prisma } from "@/lib/prisma";
import { formatDate, formatNumber, formatPeriod } from "@/lib/format";
import {
  Badge,
  EmptyRow,
  PageHeading,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const sourceLabels = {
  MANUAL: "Qo'lda",
  AUTO: "Avtomatik",
  ESTIMATED: "Hisoblangan",
} as const;

export default async function ReadingsPage() {
  const readings = await prisma.reading.findMany({
    orderBy: [{ period: "desc" }, { readingDate: "desc" }],
    take: 100,
    include: {
      meter: {
        select: {
          serialNumber: true,
          consumer: { select: { code: true, fullName: true } },
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Ko'rsatkichlar"
        description="Hisoblagichlardan olingan oylik ko'rsatkichlar (oxirgi 100 ta)."
      />

      <Table>
        <thead>
          <tr>
            <Th>Davr</Th>
            <Th>Hisoblagich</Th>
            <Th>Abonent</Th>
            <Th align="right">Oldingi</Th>
            <Th align="right">Joriy</Th>
            <Th align="right">Iste&apos;mol</Th>
            <Th>Manba</Th>
            <Th>Sana</Th>
          </tr>
        </thead>
        <tbody>
          {readings.length === 0 ? (
            <EmptyRow colSpan={8}>
              Hozircha ko&apos;rsatkich kiritilmagan.
            </EmptyRow>
          ) : (
            readings.map((reading) => (
              <Tr key={reading.id}>
                <Td muted>{formatPeriod(reading.period)}</Td>
                <Td numeric>{reading.meter.serialNumber}</Td>
                <Td>{reading.meter.consumer.fullName}</Td>
                <Td align="right" muted numeric>
                  {formatNumber(reading.previousValue)}
                </Td>
                <Td align="right" numeric>
                  {formatNumber(reading.value)}
                </Td>
                <Td align="right" numeric>
                  <span className="font-medium">
                    {formatNumber(reading.consumption)}
                  </span>
                </Td>
                <Td>
                  <Badge
                    tone={reading.source === "ESTIMATED" ? "warning" : "neutral"}
                  >
                    {sourceLabels[reading.source]}
                  </Badge>
                </Td>
                <Td muted>{formatDate(reading.readingDate)}</Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
