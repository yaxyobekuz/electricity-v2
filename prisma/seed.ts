import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../app/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/*
  Tarmoq tuzilmasi — .claude/docs/ dagi hisobotlardan olingan.
  Koeffitsientlar "umumiy hisobot" faylidagi haqiqiy qiymatlar.

  Bu seed faqat TUZILMANI yaratadi (ETK → podstansiya → ввод → fider).
  Oylik ko'rsatkichlar va TP'lar Excel import orqali yuklanadi.

  Tizim tili — o'zbek lotin. `aliases` esa import uchun: kelayotgan
  fayllarda nom kirillcha yoki boshqa imloda bo'lishi mumkin.
*/

const ETK_NAME = "Chinobod ETK";

const SUBSTATION = {
  name: "Chinobod NIM stansiya 110/35/10 kV",
  voltageType: "110/35/10",
};

const TRANSFORMERS = [
  {
    name: "VVOD T1 25 000 kVA",
    capacityKva: 25000,
    feeders: [
      { name: "ChPZ", coefficient: 4000, aliases: ["ЧПЗ"] },
      { name: "Bo'zchi", coefficient: 3000, aliases: ["Бўзчи", "Bozchi"] },
      { name: "Paranda", coefficient: 2000, aliases: ["Парранда", "Parranda"] },
      { name: "Tumor", coefficient: 2000, aliases: ["Тўмор", "To'mor"] },
      {
        name: "Qo'rg'ongaz",
        coefficient: 1000,
        aliases: ["Қўргонгаз", "Қўрғонгаз", "Qorgongaz"],
      },
    ],
  },
  {
    name: "VVOD T2 40 000 kVA",
    capacityKva: 40000,
    feeders: [
      {
        name: "Jo'jaxona",
        coefficient: 3000,
        aliases: ["Жўжахона", "Jojaxona"],
      },
      { name: "Qiyali", coefficient: 2000, aliases: ["Қияли", "Kiyali"] },
      { name: "Kamoliy", coefficient: 6000, aliases: ["Камолий", "Kamoly"] },
      { name: "Tashlama", coefficient: 2000, aliases: ["Ташлама"] },
      { name: "Tola", coefficient: 3000, aliases: ["Тола"] },
      {
        name: "Xaqulobod",
        coefficient: 4000,
        aliases: ["Хақулобод", "Ҳакулобод", "Haqulobod", "Hakulobod"],
      },
    ],
  },
];

async function main() {
  const etk = await prisma.etk.upsert({
    where: { name: ETK_NAME },
    update: {},
    create: { name: ETK_NAME },
  });

  const substation = await prisma.substation.upsert({
    where: { name: SUBSTATION.name },
    update: { voltageType: SUBSTATION.voltageType, etkId: etk.id },
    create: { ...SUBSTATION, etkId: etk.id },
  });

  for (const item of TRANSFORMERS) {
    const transformer = await prisma.transformer.upsert({
      where: {
        substationId_name: { substationId: substation.id, name: item.name },
      },
      update: { capacityKva: item.capacityKva },
      create: {
        substationId: substation.id,
        name: item.name,
        capacityKva: item.capacityKva,
      },
    });

    for (const feeder of item.feeders) {
      await prisma.feeder.upsert({
        where: {
          transformerId_name: {
            transformerId: transformer.id,
            name: feeder.name,
          },
        },
        // Koeffitsient va aliaslar yangilanadi — seed qayta ishga
        // tushirilganda tuzatishlar bazaga yetib borsin.
        update: { coefficient: feeder.coefficient, aliases: feeder.aliases },
        create: {
          transformerId: transformer.id,
          name: feeder.name,
          coefficient: feeder.coefficient,
          aliases: feeder.aliases,
        },
      });
    }
  }

  const [transformers, feeders] = await Promise.all([
    prisma.transformer.count(),
    prisma.feeder.count(),
  ]);

  console.log(
    `Seed: ${ETK_NAME} → ${substation.name} → ${transformers} vvod → ${feeders} fider.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
