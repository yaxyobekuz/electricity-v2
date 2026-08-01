/*
  Warnings:

  - You are about to drop the `consumers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invoices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `meters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `readings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tariffs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_consumerId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_readingId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_tariffId_fkey";

-- DropForeignKey
ALTER TABLE "meters" DROP CONSTRAINT "meters_consumerId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_consumerId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "readings" DROP CONSTRAINT "readings_meterId_fkey";

-- DropForeignKey
ALTER TABLE "readings" DROP CONSTRAINT "readings_recordedById_fkey";

-- DropTable
DROP TABLE "consumers";

-- DropTable
DROP TABLE "invoices";

-- DropTable
DROP TABLE "meters";

-- DropTable
DROP TABLE "payments";

-- DropTable
DROP TABLE "readings";

-- DropTable
DROP TABLE "tariffs";

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "ConsumerType";

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "MeterStatus";

-- DropEnum
DROP TYPE "MeterType";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "ReadingSource";

-- DropEnum
DROP TYPE "TariffCategory";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "substations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "voltageType" TEXT NOT NULL,
    "address" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "substations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transformers" (
    "id" TEXT NOT NULL,
    "substationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacityKva" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transformers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeders" (
    "id" TEXT NOT NULL,
    "transformerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "voltage" INTEGER NOT NULL DEFAULT 10,
    "coefficient" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feeders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeder_readings" (
    "id" TEXT NOT NULL,
    "feederId" TEXT NOT NULL,
    "readingDate" DATE NOT NULL,
    "meterValue" DECIMAL(14,2) NOT NULL,
    "previousValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "difference" DECIMAL(14,2) NOT NULL,
    "consumedKwh" DECIMAL(16,2) NOT NULL,
    "coefficient" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feeder_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tp_points" (
    "id" TEXT NOT NULL,
    "feederId" TEXT NOT NULL,
    "tpNumber" TEXT NOT NULL,
    "address" TEXT,
    "capacityKva" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tp_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "substations_name_key" ON "substations"("name");

-- CreateIndex
CREATE INDEX "transformers_substationId_idx" ON "transformers"("substationId");

-- CreateIndex
CREATE UNIQUE INDEX "transformers_substationId_name_key" ON "transformers"("substationId", "name");

-- CreateIndex
CREATE INDEX "feeders_transformerId_idx" ON "feeders"("transformerId");

-- CreateIndex
CREATE UNIQUE INDEX "feeders_transformerId_name_key" ON "feeders"("transformerId", "name");

-- CreateIndex
CREATE INDEX "feeder_readings_readingDate_idx" ON "feeder_readings"("readingDate");

-- CreateIndex
CREATE UNIQUE INDEX "feeder_readings_feederId_readingDate_key" ON "feeder_readings"("feederId", "readingDate");

-- CreateIndex
CREATE UNIQUE INDEX "tp_points_tpNumber_key" ON "tp_points"("tpNumber");

-- CreateIndex
CREATE INDEX "tp_points_feederId_idx" ON "tp_points"("feederId");

-- AddForeignKey
ALTER TABLE "transformers" ADD CONSTRAINT "transformers_substationId_fkey" FOREIGN KEY ("substationId") REFERENCES "substations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feeders" ADD CONSTRAINT "feeders_transformerId_fkey" FOREIGN KEY ("transformerId") REFERENCES "transformers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feeder_readings" ADD CONSTRAINT "feeder_readings_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "feeders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tp_points" ADD CONSTRAINT "tp_points_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "feeders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
