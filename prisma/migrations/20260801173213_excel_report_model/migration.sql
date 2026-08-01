-- DropIndex
DROP INDEX "feeder_readings_feederId_readingDate_key";

-- DropIndex
DROP INDEX "feeder_readings_readingDate_idx";

-- AlterTable
ALTER TABLE "feeder_readings" DROP COLUMN "readingDate",
ADD COLUMN     "commercialLossKwh" DECIMAL(16,2),
ADD COLUMN     "electricFlowKwh" DECIMAL(16,2),
ADD COLUMN     "period" DATE NOT NULL,
ADD COLUMN     "technicalLossKwh" DECIMAL(16,2),
ADD COLUMN     "technicalLossPercent" DECIMAL(5,2) NOT NULL DEFAULT 12;

-- AlterTable
ALTER TABLE "feeders" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "substations" ADD COLUMN     "etkId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tp_points" ADD COLUMN     "coefficient" INTEGER NOT NULL,
ADD COLUMN     "meterSerial" TEXT,
ADD COLUMN     "meterType" TEXT;

-- CreateTable
CREATE TABLE "etks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tp_readings" (
    "id" TEXT NOT NULL,
    "tpPointId" TEXT NOT NULL,
    "period" DATE NOT NULL,
    "meterValue" DECIMAL(14,2) NOT NULL,
    "previousValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "difference" DECIMAL(14,2) NOT NULL,
    "consumedKwh" DECIMAL(16,2) NOT NULL,
    "coefficient" INTEGER NOT NULL,
    "consumersTotal" INTEGER,
    "consumersOnline" INTEGER,
    "consumersOffline" INTEGER,
    "zoneT1" DECIMAL(14,2),
    "zoneT2" DECIMAL(14,2),
    "zoneT3" DECIMAL(14,2),
    "zoneT4" DECIMAL(14,2),
    "reactivePlus" DECIMAL(14,2),
    "reactiveMinus" DECIMAL(14,2),
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tp_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "etks_name_key" ON "etks"("name");

-- CreateIndex
CREATE INDEX "tp_readings_period_idx" ON "tp_readings"("period");

-- CreateIndex
CREATE UNIQUE INDEX "tp_readings_tpPointId_period_key" ON "tp_readings"("tpPointId", "period");

-- CreateIndex
CREATE INDEX "feeder_readings_period_idx" ON "feeder_readings"("period");

-- CreateIndex
CREATE UNIQUE INDEX "feeder_readings_feederId_period_key" ON "feeder_readings"("feederId", "period");

-- CreateIndex
CREATE INDEX "substations_etkId_idx" ON "substations"("etkId");

-- CreateIndex
CREATE UNIQUE INDEX "tp_points_meterSerial_key" ON "tp_points"("meterSerial");

-- AddForeignKey
ALTER TABLE "substations" ADD CONSTRAINT "substations_etkId_fkey" FOREIGN KEY ("etkId") REFERENCES "etks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tp_readings" ADD CONSTRAINT "tp_readings_tpPointId_fkey" FOREIGN KEY ("tpPointId") REFERENCES "tp_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

