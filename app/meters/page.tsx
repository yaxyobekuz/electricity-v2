import { prisma } from "@/lib/prisma";
import { formatDate, formatNumber } from "@/lib/format";
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

const statusLabels = {
  ACTIVE: { label: "Faol", tone: "success" },
  INACTIVE: { label: "O'chirilgan", tone: "neutral" },
  FAULTY: { label: "Nosoz", tone: "danger" },
  REMOVED: { label: "Demontaj", tone: "warning" },
} as const;

export default async function MetersPage() {
  const meters = await prisma.meter.findMany({
    orderBy: { serialNumber: "asc" },
    include: { consumer: { select: { code: true, fullName: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Hisoblagichlar"
        description={`Jami ${meters.length} ta hisoblagich.`}
      />

      <Table>
        <thead>
          <tr>
            <Th>Seriya raqami</Th>
            <Th>Abonent</Th>
            <Th>Turi</Th>
            <Th align="right">Boshlang&apos;ich</Th>
            <Th>O&apos;rnatilgan</Th>
            <Th>Holat</Th>
          </tr>
        </thead>
        <tbody>
          {meters.length === 0 ? (
            <EmptyRow colSpan={6}>
              Hozircha hisoblagich qo&apos;shilmagan.
            </EmptyRow>
          ) : (
            meters.map((meter) => {
              const status = statusLabels[meter.status];
              return (
                <Tr key={meter.id}>
                  <Td numeric>{meter.serialNumber}</Td>
                  <Td>
                    {meter.consumer.fullName}
                    <span className="ml-2 text-xs text-zinc-500">
                      {meter.consumer.code}
                    </span>
                  </Td>
                  <Td muted>
                    {meter.type === "THREE_PHASE" ? "Uch fazali" : "Bir fazali"}
                  </Td>
                  <Td align="right" numeric>
                    {formatNumber(meter.initialReading)}
                  </Td>
                  <Td muted>{formatDate(meter.installedAt)}</Td>
                  <Td>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </Table>
    </div>
  );
}
