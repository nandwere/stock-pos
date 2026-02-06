/*
  Warnings:

  - You are about to alter the column `recordedSales` on the `DailySummary` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `estimatedSales` on the `DailySummary` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `quantity` on the `SaleItem` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `quantity` on the `StockAdjustment` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "DailySummary" ALTER COLUMN "recordedSales" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "estimatedSales" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "currentStock" SET DEFAULT 0,
ALTER COLUMN "currentStock" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "reorderLevel" SET DEFAULT 0,
ALTER COLUMN "reorderLevel" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "SaleItem" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "StockAdjustment" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,2);
