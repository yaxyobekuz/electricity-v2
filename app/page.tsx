import { Gauge, Receipt, Users, Zap } from "lucide-react";

import { prisma } from "@/lib/prisma";

// Sahifa har so'rovda bazadan o'qiydi — build paytida prerender qilinmaydi.
export const dynamic = "force-dynamic";

/** Joriy oyning birinchi kuni (hisobot davri kaliti). */
function currentPeriod() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

const numberFormat = new Intl.NumberFormat("uz-UZ");

export default async function Home() {
  const period = currentPeriod();

  const [consumerCount, activeMeterCount, consumption, collected] =
    await Promise.all([
      prisma.consumer.count({ where: { isActive: true } }),
      prisma.meter.count({ where: { status: "ACTIVE" } }),
      prisma.reading.aggregate({
        where: { period },
        _sum: { consumption: true },
      }),
      prisma.payment.aggregate({
        where: { paidAt: { gte: period } },
        _sum: { amount: true },
      }),
    ]);

  const stats = [
    {
      label: "Iste'molchilar",
      value: numberFormat.format(consumerCount),
      icon: Users,
    },
    {
      label: "Faol hisoblagichlar",
      value: numberFormat.format(activeMeterCount),
      icon: Gauge,
    },
    {
      label: "Oylik iste'mol",
      value: `${numberFormat.format(Number(consumption._sum.consumption ?? 0))} kVt·s`,
      icon: Zap,
    },
    {
      label: "Yig'ilgan to'lov",
      value: `${numberFormat.format(Number(collected._sum.amount ?? 0))} so'm`,
      icon: Receipt,
    },
  ];

  const recentPayments = await prisma.payment.findMany({
    take: 5,
    orderBy: { paidAt: "desc" },
    include: { consumer: { select: { code: true, fullName: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Umumiy holat</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Joriy oy bo&apos;yicha asosiy ko&apos;rsatkichlar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <div className="flex items-center gap-2 text-zinc-500">
              <stat.icon className="size-4" />
              <span className="text-sm">{stat.label}</span>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <h3 className="border-b border-zinc-200 px-5 py-4 text-sm font-semibold dark:border-zinc-800">
          Oxirgi to&apos;lovlar
        </h3>

        {recentPayments.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">
            Hozircha to&apos;lov yo&apos;q.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recentPayments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {payment.consumer.fullName}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {payment.consumer.code}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {numberFormat.format(Number(payment.amount))} so&apos;m
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
