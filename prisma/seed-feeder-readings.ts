import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../app/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/*
  Fider darajasidagi ko'rsatkichlar — .claude/docs/umumiy_hisobot.xlsx
  faylidagi HAQIQIY qiymatlar.

  Ustunlar mosligi:
    "Бир ойлик окиб утган электр"          → consumedKwh   (farq × koeffitsient)
    "Elektr oqimi"                          → electricFlowKwh (yetib borgan foydali oqim)
    "Texnoligik yo'qotish 12% koefitsiyent" → texnologik yo'qotish
    "Tijoriy yo'qotish"                     → tijoriy yo'qotish

  DIQQAT: "Elektr oqimi" TP hisoblagichlari yig'indisi EMAS — u alohida
  o'lchanadigan qiymat. Ba'zi fiderlarda ular mos keladi (Jo'jaxona,
  Kamoliy), ba'zilarida esa yo'q. Shuning uchun u bazaga alohida saqlanadi,
  TP yig'indisi esa solishtirish uchun alohida hisoblanadi.

  T1 ввод'idagi fiderlarda oqim o'lchanmagan — ular uchun `flow` yo'q.

  Ishga tushirish: npx tsx prisma/seed-feeder-readings.ts
*/

type Row = {
  july: number;
  august: number;
  /** "Elektr oqimi" — o'lchanmagan bo'lsa null. */
  flow: number | null;
};

const READINGS: Record<string, Row> = {
  // ВВОД Т1 — oqim o'lchanmagan
  ChPZ: { july: 1290, august: 1295, flow: null },
  "Bo'zchi": { july: 8952, august: 9194, flow: null },
  Paranda: { july: 10791, august: 10926, flow: null },
  Tumor: { july: 2872, august: 3009, flow: null },
  "Qo'rg'ongaz": { july: 804, august: 845, flow: null },

  // ВВОД Т2 — oqim o'lchangan
  "Jo'jaxona": { july: 28181, august: 28325, flow: 317911.8 },
  Qiyali: { july: 8450, august: 8550, flow: 155565.7 },
  Kamoliy: { july: 18470, august: 18607, flow: 565384.9 },
  Tashlama: { july: 7312, august: 7451, flow: 237989.3 },
  Tola: { july: 17523, august: 17594, flow: 155987.9 },
  Xaqulobod: { july: 19850, august: 20112, flow: 683812.3 },
};

const JULY = new Date(Date.UTC(2026, 6, 1));
const AUGUST = new Date(Date.UTC(2026, 7, 1));
const TECHNICAL_PERCENT = 12;

async function main() {
  const feeders = await prisma.feeder.findMany({
    select: { id: true, name: true, coefficient: true },
  });

  const missing: string[] = [];
  const mismatched: string[] = [];
  let saved = 0;

  for (const [name, row] of Object.entries(READINGS)) {
    const feeder = feeders.find((f) => f.name === name);
    if (!feeder) {
      missing.push(name);
      continue;
    }

    // Iyul — boshlang'ich o'lchov: oldingi ko'rsatkich noma'lum,
    // shuning uchun iste'mol hisoblanmaydi.
    const july = {
      meterValue: row.july,
      previousValue: 0,
      difference: 0,
      consumedKwh: 0,
      coefficient: feeder.coefficient,
      technicalLossPercent: TECHNICAL_PERCENT,
      electricFlowKwh: null,
      isBaseline: true,
    };

    await prisma.feederReading.upsert({
      where: { feederId_period: { feederId: feeder.id, period: JULY } },
      update: july,
      create: { feederId: feeder.id, period: JULY, ...july },
    });

    const difference = row.august - row.july;
    const consumedKwh = difference * feeder.coefficient;

    // Fayldagi "Бир ойлик окиб утган электр" bilan solishtiramiz —
    // koeffitsient noto'g'ri bo'lsa shu yerda ko'rinadi.
    const technical = (consumedKwh * TECHNICAL_PERCENT) / 100;
    if (row.flow !== null && row.flow + technical > consumedKwh) {
      mismatched.push(
        `${name}: oqim ${row.flow} + texnologik ${technical} > iste'mol ${consumedKwh}`,
      );
    }

    const august = {
      meterValue: row.august,
      previousValue: row.july,
      difference,
      consumedKwh,
      coefficient: feeder.coefficient,
      technicalLossPercent: TECHNICAL_PERCENT,
      electricFlowKwh: row.flow,
      isBaseline: false,
    };

    await prisma.feederReading.upsert({
      where: { feederId_period: { feederId: feeder.id, period: AUGUST } },
      update: august,
      create: { feederId: feeder.id, period: AUGUST, ...august },
    });

    saved += 1;
  }

  const agg = await prisma.feederReading.aggregate({
    where: { period: AUGUST },
    _sum: { consumedKwh: true, electricFlowKwh: true },
  });

  console.log(`${saved} ta fider uchun iyul va avgust saqlandi.`);
  if (missing.length) console.log("Topilmagan fiderlar:", missing.join(", "));
  if (mismatched.length) {
    console.log("Ziddiyatli qatorlar:");
    for (const m of mismatched) console.log("  " + m);
  }
  console.log(`Avgust jami iste'mol : ${agg._sum.consumedKwh}`);
  console.log(`Avgust jami oqim     : ${agg._sum.electricFlowKwh}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
