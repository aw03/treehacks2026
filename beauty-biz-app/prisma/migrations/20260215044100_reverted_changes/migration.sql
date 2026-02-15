/*
  Warnings:

  - You are about to drop the column `endTime` on the `ServiceInstance` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `ServiceInstance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ServiceInstance" DROP COLUMN "endTime",
DROP COLUMN "startTime";
