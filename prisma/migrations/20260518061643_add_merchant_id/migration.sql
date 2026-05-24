/*
  Warnings:

  - Made the column `merchantId` on table `Category` required. This step will fail if there are existing NULL values in that column.
  - Made the column `merchantId` on table `DailySummary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `merchantId` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `merchantId` on table `Sale` required. This step will fail if there are existing NULL values in that column.
  - Made the column `merchantId` on table `Settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `merchantId` on table `Shift` required. This step will fail if there are existing NULL values in that column.
  - Made the column `merchantId` on table `StockAdjustment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `merchantId` on table `StockCount` required. This step will fail if there are existing NULL values in that column.
  - Made the column `merchantId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "merchantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DailySummary" ALTER COLUMN "merchantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "merchantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "merchantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Settings" ALTER COLUMN "merchantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Shift" ALTER COLUMN "merchantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "StockAdjustment" ALTER COLUMN "merchantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "StockCount" ALTER COLUMN "merchantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "merchantId" SET NOT NULL;
