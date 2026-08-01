import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../app/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Joriy oyning birinchi kuni. */
function periodOf(monthsAgo = 0) {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1),
  );
}

const consumers = [
  {
    code: "AB-100001",
    fullName: "Aliyev Sardor",
    address: "Toshkent sh., Chilonzor t., 12-uy",
    district: "Chilonzor",
    serial: "MTR-000001",
    kwh: 245.5,
  },
  {
    code: "AB-100002",
    fullName: "Karimova Nilufar",
    address: "Toshkent sh., Yunusobod t., 44-uy",
    district: "Yunusobod",
    serial: "MTR-000002",
    kwh: 178.25,
  },
  {
    code: "AB-100003",
    fullName: '"Oq Yo\'l" MChJ',
    address: "Toshkent sh., Mirzo Ulug'bek t., 7-uy",
    district: "Mirzo Ulug'bek",
    serial: "MTR-000003",
    kwh: 1420,
    legal: true,
  },
];

async function main() {
  const tariff = await prisma.tariff.upsert({
    where: { id: "seed-tariff-residential" },
    update: {},
    create: {
      id: "seed-tariff-residential",
      name: "Aholi uchun asosiy tarif",
      category: "RESIDENTIAL",
      pricePerKwh: 450,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@electricity.uz" },
    update: {},
    create: {
      email: "admin@electricity.uz",
      fullName: "Tizim administratori",
      // Namuna qiymat — haqiqiy autentifikatsiya qo'shilganda almashtiriladi.
      passwordHash: "SEED_PLACEHOLDER_NOT_A_REAL_HASH",
      role: "ADMIN",
    },
  });

  const period = periodOf();

  for (const [index, item] of consumers.entries()) {
    const consumer = await prisma.consumer.upsert({
      where: { code: item.code },
      update: {},
      create: {
        code: item.code,
        fullName: item.fullName,
        type: item.legal ? "LEGAL" : "INDIVIDUAL",
        address: item.address,
        region: "Toshkent shahri",
        district: item.district,
      },
    });

    const meter = await prisma.meter.upsert({
      where: { serialNumber: item.serial },
      update: {},
      create: {
        serialNumber: item.serial,
        consumerId: consumer.id,
        type: item.legal ? "THREE_PHASE" : "SINGLE_PHASE",
      },
    });

    const reading = await prisma.reading.upsert({
      where: { meterId_period: { meterId: meter.id, period } },
      update: {},
      create: {
        meterId: meter.id,
        period,
        previousValue: 0,
        value: item.kwh,
        consumption: item.kwh,
        source: "MANUAL",
        recordedById: admin.id,
      },
    });

    const amount = item.kwh * Number(tariff.pricePerKwh);

    await prisma.invoice.upsert({
      where: { readingId: reading.id },
      update: {},
      create: {
        number: `INV-${period.getUTCFullYear()}-${String(period.getUTCMonth() + 1).padStart(2, "0")}-${String(index + 1).padStart(6, "0")}`,
        consumerId: consumer.id,
        readingId: reading.id,
        tariffId: tariff.id,
        period,
        consumptionKwh: item.kwh,
        pricePerKwh: tariff.pricePerKwh,
        amount,
        status: "ISSUED",
        issuedAt: new Date(),
      },
    });

    // Birinchi ikki iste'molchi to'lov qilgan deb hisoblaymiz.
    if (index < 2) {
      const existing = await prisma.payment.findFirst({
        where: { consumerId: consumer.id, paidAt: { gte: period } },
      });
      if (!existing) {
        await prisma.payment.create({
          data: {
            consumerId: consumer.id,
            amount,
            method: index === 0 ? "CARD" : "CASH",
          },
        });
      }
    }
  }

  console.log("Seed yakunlandi.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
