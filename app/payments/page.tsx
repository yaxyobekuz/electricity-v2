import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
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

const methodLabels = {
  CASH: "Naqd",
  CARD: "Karta",
  TRANSFER: "O'tkazma",
  ONLINE: "Onlayn",
} as const;

export default async function PaymentsPage() {
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { paidAt: "desc" },
      take: 100,
      include: {
        consumer: { select: { code: true, fullName: true } },
        invoice: { select: { number: true } },
      },
    }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="To'lovlar"
        description={`Jami yig'ilgan: ${formatMoney(total._sum.amount)}.`}
      />

      <Table>
        <thead>
          <tr>
            <Th>Sana</Th>
            <Th>Abonent</Th>
            <Th>Shartnoma</Th>
            <Th>Hisob-faktura</Th>
            <Th>Usul</Th>
            <Th align="right">Summa</Th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <EmptyRow colSpan={6}>Hozircha to&apos;lov yo&apos;q.</EmptyRow>
          ) : (
            payments.map((payment) => (
              <Tr key={payment.id}>
                <Td muted>{formatDate(payment.paidAt)}</Td>
                <Td>{payment.consumer.fullName}</Td>
                <Td muted numeric>
                  {payment.consumer.code}
                </Td>
                <Td muted numeric>
                  {payment.invoice?.number ?? "— (oldindan to'lov)"}
                </Td>
                <Td>
                  <Badge>{methodLabels[payment.method]}</Badge>
                </Td>
                <Td align="right" numeric>
                  <span className="font-medium">
                    {formatMoney(payment.amount)}
                  </span>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
