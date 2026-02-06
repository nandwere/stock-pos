/*
  Warnings:

  - You are about to alter the column `expectedQty` on the `StockCount` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `actualQty` on the `StockCount` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `variance` on the `StockCount` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "StockCount" ALTER COLUMN "expectedQty" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "actualQty" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "variance" SET DATA TYPE DECIMAL(10,2);
