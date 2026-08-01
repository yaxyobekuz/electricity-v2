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

const categoryLabels = {
  RESIDENTIAL: "Aholi",
  COMMERCIAL: "Tijorat",
  INDUSTRIAL: "Sanoat",
  AGRICULTURAL: "Qishloq xo'jaligi",
} as const;

export default async function TariffsPage() {
  const tariffs = await prisma.tariff.findMany({
    orderBy: [{ isActive: "desc" }, { validFrom: "desc" }],
    include: { _count: { select: { invoices: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Tariflar"
        description="Narx o'zgarganda eski tarif tahrirlanmaydi — yangi yozuv ochiladi, shuning uchun tarix saqlanadi."
      />

      <Table>
        <thead>
          <tr>
            <Th>Nomi</Th>
            <Th>Toifa</Th>
            <Th align="right">1 kVt·s narxi</Th>
            <Th>Amal qiladi</Th>
            <Th align="right">Hisob-faktura</Th>
            <Th>Holat</Th>
          </tr>
        </thead>
        <tbody>
          {tariffs.length === 0 ? (
            <EmptyRow colSpan={6}>Hozircha tarif qo&apos;shilmagan.</EmptyRow>
          ) : (
            tariffs.map((tariff) => (
              <Tr key={tariff.id}>
                <Td>{tariff.name}</Td>
                <Td muted>{categoryLabels[tariff.category]}</Td>
                <Td align="right" numeric>
                  {formatNumber(tariff.pricePerKwh)} {tariff.currency}
                </Td>
                <Td muted>
                  {formatDate(tariff.validFrom)} —{" "}
                  {tariff.validTo ? formatDate(tariff.validTo) : "hozirgacha"}
                </Td>
                <Td align="right" numeric>
                  {tariff._count.invoices}
                </Td>
                <Td>
                  <Badge tone={tariff.isActive ? "success" : "neutral"}>
                    {tariff.isActive ? "Amalda" : "Arxiv"}
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
