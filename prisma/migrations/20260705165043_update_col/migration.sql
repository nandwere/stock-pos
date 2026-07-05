/*
  Warnings:

  - You are about to alter the column `totalSales` on the `DailySummary` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `totalCost` on the `DailySummary` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `grossProfit` on the `DailySummary` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `recordedSales` on the `DailySummary` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `estimatedSales` on the `DailySummary` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `cashSales` on the `DailySummary` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `cardSales` on the `DailySummary` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `mobilePayments` on the `DailySummary` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `amount` on the `Expense` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `tax` on the `Expense` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `total` on the `Expense` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `quantity` on the `ExpenseItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `unitPrice` on the `ExpenseItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `subtotal` on the `ExpenseItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `costPrice` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `sellingPrice` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `subtotal` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `tax` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `discount` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `total` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `amountPaid` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `change` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `quantity` on the `SaleItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `unitPrice` on the `SaleItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `subtotal` on the `SaleItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `openingCash` on the `Shift` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `closingCash` on the `Shift` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `expectedCash` on the `Shift` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `variance` on the `Shift` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `quantity` on the `StockAdjustment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `expectedQty` on the `StockCount` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `actualQty` on the `StockCount` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `variance` on the `StockCount` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.

*/
-- AlterTable
ALTER TABLE "DailySummary" ALTER COLUMN "totalSales" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "totalCost" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "grossProfit" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "recordedSales" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "estimatedSales" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "cashSales" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "cardSales" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "mobilePayments" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "tax" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "ExpenseItem" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "costPrice" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "sellingPrice" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "tax" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "amountPaid" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "change" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "SaleItem" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "Shift" ALTER COLUMN "openingCash" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "closingCash" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "expectedCash" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "variance" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "StockAdjustment" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "StockCount" ALTER COLUMN "expectedQty" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "actualQty" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "variance" SET DATA TYPE DECIMAL(10,3);
