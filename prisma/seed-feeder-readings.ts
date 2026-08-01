import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../app/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/*
  Fider darajasidagi ko'rsatkichlar — .claude/docs/umumiy_hisobot.xlsx
  faylidagi HAQIQIY qiymatlar.

  01.07.2026 — boshlang'ich o'lchov (undan oldingi ko'rsatkich noma'lum,
               shuning uchun iste'mol hisoblanmaydi).
  01.08.2026 — hisoblanadigan davr.

  Buni alohida fayl qilib qo'ydik, chunki `seed.ts` faqat TUZILMANI yaratadi.
  Ishga tushirish: npx tsx prisma/seed-feeder-readings.ts
*/

const READINGS: Record<string, { july: number; august: number }> = {
  ChPZ: { july: 1290, august: 1295 },
  "Bo'zchi": { july: 8952, august: 9194 },
  Paranda: { july: 10791, august: 10926 },
  Tumor: { july: 2872, august: 3009 },
  "Qo'rg'ongaz": { july: 804, august: 845 },
  "Jo'jaxona": { july: 28181, august: 28325 },
  Qiyali: { july: 8450, august: 8550 },
  Kamoliy: { july: 18470, august: 18707 },
  Tashlama: { july: 7312, august: 7451 },
  Tola: { july: 17523, august: 17594 },
  Xaqulobod: { july: 19850, august: 19989 },
};

const JULY = new Date(Date.UTC(2026, 6, 1));
const AUGUST = new Date(Date.UTC(2026, 7, 1));

async function main() {
  const feeders = await prisma.feeder.findMany({
    select: { id: true, name: true, coefficient: true },
  });

  let saved = 0;
  const missing: string[] = [];

  for (const [name, values] of Object.entries(READINGS)) {
    const feeder = feeders.find((f) => f.name === name);
    if (!feeder) {
      missing.push(name);
      continue;
    }

    // Iyul — boshlang'ich: iste'mol hisoblanmaydi.
    const july = {
      meterValue: values.july,
      previousValue: 0,
      difference: 0,
      consumedKwh: 0,
      coefficient: feeder.coefficient,
      technicalLossPercent: 12,
      isBaseline: true,
    };

    await prisma.feederReading.upsert({
      where: { feederId_period: { feederId: feeder.id, period: JULY } },
      update: july,
      create: { feederId: feeder.id, period: JULY, ...july },
    });

    const difference = values.august - values.july;
    const august = {
      meterValue: values.august,
      previousValue: values.july,
      difference,
      consumedKwh: difference * feeder.coefficient,
      coefficient: feeder.coefficient,
      technicalLossPercent: 12,
      isBaseline: false,
    };

    await prisma.feederReading.upsert({
      where: { feederId_period: { feederId: feeder.id, period: AUGUST } },
      update: august,
      create: { feederId: feeder.id, period: AUGUST, ...august },
    });

    saved += 1;
  }

  const total = await prisma.feederReading.aggregate({
    where: { period: AUGUST },
    _sum: { consumedKwh: true },
  });

  console.log(`${saved} ta fider uchun iyul va avgust ko'rsatkichlari saqlandi.`);
  if (missing.length) console.log("Topilmagan fiderlar:", missing.join(", "));
  console.log(`Avgust jami iste'mol: ${total._sum.consumedKwh} kVt·s`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
