import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
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

export default async function ConsumersPage() {
  const consumers = await prisma.consumer.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { meters: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Iste'molchilar"
        description={`Jami ${consumers.length} ta abonent.`}
      />

      <Table>
        <thead>
          <tr>
            <Th>Shartnoma</Th>
            <Th>F.I.O. / Tashkilot</Th>
            <Th>Turi</Th>
            <Th>Manzil</Th>
            <Th align="right">Hisoblagich</Th>
            <Th align="right">Balans</Th>
            <Th>Holat</Th>
          </tr>
        </thead>
        <tbody>
          {consumers.length === 0 ? (
            <EmptyRow colSpan={7}>Hozircha abonent qo&apos;shilmagan.</EmptyRow>
          ) : (
            consumers.map((consumer) => (
              <Tr key={consumer.id}>
                <Td numeric>{consumer.code}</Td>
                <Td>{consumer.fullName}</Td>
                <Td muted>
                  {consumer.type === "LEGAL" ? "Yuridik" : "Jismoniy"}
                </Td>
                <Td muted>{consumer.address}</Td>
                <Td align="right" numeric>
                  {consumer._count.meters}
                </Td>
                <Td align="right" numeric>
                  {formatMoney(consumer.balance)}
                </Td>
                <Td>
                  <Badge tone={consumer.isActive ? "success" : "neutral"}>
                    {consumer.isActive ? "Faol" : "Nofaol"}
                  </Badge>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
