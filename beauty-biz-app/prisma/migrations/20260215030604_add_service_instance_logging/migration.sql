-- CreateEnum
CREATE TYPE "ServiceInstanceSource" AS ENUM ('APPOINTMENT', 'WALK_IN');

-- CreateTable
CREATE TABLE "ServiceInstance" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "source" "ServiceInstanceSource" NOT NULL DEFAULT 'APPOINTMENT',
    "actualDurationMin" INTEGER,
    "notes" TEXT,
    "priceAtCompletion" DECIMAL(10,2),

    CONSTRAINT "ServiceInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceInstanceSupplyUsage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "instanceId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "quantityUsed" DECIMAL(10,2) NOT NULL,
    "unit" TEXT,
    "method" TEXT,
    "rawInput" TEXT,

    CONSTRAINT "ServiceInstanceSupplyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceInstance_appointmentId_key" ON "ServiceInstance"("appointmentId");

-- CreateIndex
CREATE INDEX "ServiceInstanceSupplyUsage_instanceId_idx" ON "ServiceInstanceSupplyUsage"("instanceId");

-- CreateIndex
CREATE INDEX "ServiceInstanceSupplyUsage_supplyId_idx" ON "ServiceInstanceSupplyUsage"("supplyId");

-- AddForeignKey
ALTER TABLE "ServiceInstance" ADD CONSTRAINT "ServiceInstance_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInstance" ADD CONSTRAINT "ServiceInstance_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInstance" ADD CONSTRAINT "ServiceInstance_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInstanceSupplyUsage" ADD CONSTRAINT "ServiceInstanceSupplyUsage_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ServiceInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInstanceSupplyUsage" ADD CONSTRAINT "ServiceInstanceSupplyUsage_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "SupplyItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
