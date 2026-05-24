/*
  Warnings:

  - A unique constraint covering the columns `[merchantId,name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[merchantId,date]` on the table `DailySummary` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[merchantId,sku]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[merchantId,barcode]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[merchantId,saleNumber]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[merchantId,key]` on the table `Settings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[merchantId,email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `merchantId` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `merchantId` to the `DailySummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `merchantId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `merchantId` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `merchantId` to the `Settings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `merchantId` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `merchantId` to the `StockAdjustment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `merchantId` to the `StockCount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `merchantId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MerchantPlan" AS ENUM ('FREE', 'STARTER', 'GROWTH', 'ENTERPRISE');

-- DropIndex
DROP INDEX "Category_name_idx";

-- DropIndex
DROP INDEX "DailySummary_date_idx";

-- DropIndex
DROP INDEX "Product_barcode_idx";

-- DropIndex
DROP INDEX "Product_categoryId_idx";

-- DropIndex
DROP INDEX "Product_currentStock_idx";

-- DropIndex
DROP INDEX "Product_sku_idx";

-- DropIndex
DROP INDEX "Sale_createdAt_idx";

-- DropIndex
DROP INDEX "Sale_paymentMethod_idx";

-- DropIndex
DROP INDEX "Sale_saleNumber_idx";

-- DropIndex
DROP INDEX "Sale_userId_idx";

-- DropIndex
DROP INDEX "Settings_key_idx";

-- DropIndex
DROP INDEX "Shift_startTime_idx";

-- DropIndex
DROP INDEX "Shift_userId_idx";

-- DropIndex
DROP INDEX "StockAdjustment_createdAt_idx";

-- DropIndex
DROP INDEX "StockAdjustment_productId_idx";

-- DropIndex
DROP INDEX "StockAdjustment_type_idx";

-- DropIndex
DROP INDEX "StockAdjustment_userId_idx";

-- DropIndex
DROP INDEX "StockCount_countDate_idx";

-- DropIndex
DROP INDEX "StockCount_productId_idx";

-- DropIndex
DROP INDEX "StockCount_userId_idx";

-- DropIndex
DROP INDEX "User_role_idx";

-- ── 2. Add merchantId columns as nullable (avoids the NOT NULL error) ─
ALTER TABLE "User"             ADD COLUMN "merchantId" TEXT;
ALTER TABLE "Category"         ADD COLUMN "merchantId" TEXT;
ALTER TABLE "Product"          ADD COLUMN "merchantId" TEXT;
ALTER TABLE "Sale"             ADD COLUMN "merchantId" TEXT;
ALTER TABLE "StockCount"       ADD COLUMN "merchantId" TEXT;
ALTER TABLE "StockAdjustment"  ADD COLUMN "merchantId" TEXT;
ALTER TABLE "DailySummary"     ADD COLUMN "merchantId" TEXT;
ALTER TABLE "Shift"            ADD COLUMN "merchantId" TEXT;
ALTER TABLE "Settings"         ADD COLUMN "merchantId" TEXT;

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "logoUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Nairobi',
    "plan" "MerchantPlan" NOT NULL DEFAULT 'FREE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- ── 3. Insert the Baraka merchant and backfill every existing row ──────

INSERT INTO "Merchant" ("id", "name", "slug", "email", "currency", "timezone", "plan", "isActive", "updatedAt")
VALUES ('cm7x9k2p40000ld0hq3j5n8vk', 'Baraka Shop', 'baraka', 'admin@baraka.com', 'KES', 'Africa/Nairobi', 'STARTER', true, CURRENT_TIMESTAMP);

UPDATE "User"            SET "merchantId" = 'cm7x9k2p40000ld0hq3j5n8vk';
UPDATE "Category"        SET "merchantId" = 'cm7x9k2p40000ld0hq3j5n8vk';
UPDATE "Product"         SET "merchantId" = 'cm7x9k2p40000ld0hq3j5n8vk';
UPDATE "Sale"            SET "merchantId" = 'cm7x9k2p40000ld0hq3j5n8vk';
UPDATE "StockCount"      SET "merchantId" = 'cm7x9k2p40000ld0hq3j5n8vk';
UPDATE "StockAdjustment" SET "merchantId" = 'cm7x9k2p40000ld0hq3j5n8vk';
UPDATE "DailySummary"    SET "merchantId" = 'cm7x9k2p40000ld0hq3j5n8vk';
UPDATE "Shift"           SET "merchantId" = 'cm7x9k2p40000ld0hq3j5n8vk';
UPDATE "Settings"        SET "merchantId" = 'cm7x9k2p40000ld0hq3j5n8vk';

-- ── 4. Tighten to NOT NULL now that every row has a value ─────────────

ALTER TABLE "User"            ALTER COLUMN "merchantId" SET NOT NULL;
ALTER TABLE "Category"        ALTER COLUMN "merchantId" SET NOT NULL;
ALTER TABLE "Product"         ALTER COLUMN "merchantId" SET NOT NULL;
ALTER TABLE "Sale"            ALTER COLUMN "merchantId" SET NOT NULL;
ALTER TABLE "StockCount"      ALTER COLUMN "merchantId" SET NOT NULL;
ALTER TABLE "StockAdjustment" ALTER COLUMN "merchantId" SET NOT NULL;
ALTER TABLE "DailySummary"    ALTER COLUMN "merchantId" SET NOT NULL;
ALTER TABLE "Shift"           ALTER COLUMN "merchantId" SET NOT NULL;
ALTER TABLE "Settings"        ALTER COLUMN "merchantId" SET NOT NULL;


-- CreateIndex
CREATE UNIQUE INDEX "Merchant_slug_key" ON "Merchant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");

-- CreateIndex
CREATE INDEX "Merchant_slug_idx" ON "Merchant"("slug");

-- CreateIndex
CREATE INDEX "Merchant_email_idx" ON "Merchant"("email");

-- CreateIndex
CREATE INDEX "Merchant_plan_idx" ON "Merchant"("plan");

-- CreateIndex
CREATE INDEX "Category_merchantId_idx" ON "Category"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_merchantId_name_key" ON "Category"("merchantId", "name");

-- CreateIndex
CREATE INDEX "DailySummary_merchantId_idx" ON "DailySummary"("merchantId");

-- CreateIndex
CREATE INDEX "DailySummary_merchantId_date_idx" ON "DailySummary"("merchantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailySummary_merchantId_date_key" ON "DailySummary"("merchantId", "date");

-- CreateIndex
CREATE INDEX "Product_merchantId_idx" ON "Product"("merchantId");

-- CreateIndex
CREATE INDEX "Product_merchantId_categoryId_idx" ON "Product"("merchantId", "categoryId");

-- CreateIndex
CREATE INDEX "Product_merchantId_currentStock_idx" ON "Product"("merchantId", "currentStock");

-- CreateIndex
CREATE UNIQUE INDEX "Product_merchantId_sku_key" ON "Product"("merchantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_merchantId_barcode_key" ON "Product"("merchantId", "barcode");

-- CreateIndex
CREATE INDEX "Sale_merchantId_idx" ON "Sale"("merchantId");

-- CreateIndex
CREATE INDEX "Sale_merchantId_userId_idx" ON "Sale"("merchantId", "userId");

-- CreateIndex
CREATE INDEX "Sale_merchantId_createdAt_idx" ON "Sale"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_merchantId_paymentMethod_idx" ON "Sale"("merchantId", "paymentMethod");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_merchantId_saleNumber_key" ON "Sale"("merchantId", "saleNumber");

-- CreateIndex
CREATE INDEX "Settings_merchantId_idx" ON "Settings"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_merchantId_key_key" ON "Settings"("merchantId", "key");

-- CreateIndex
CREATE INDEX "Shift_merchantId_idx" ON "Shift"("merchantId");

-- CreateIndex
CREATE INDEX "Shift_merchantId_userId_idx" ON "Shift"("merchantId", "userId");

-- CreateIndex
CREATE INDEX "Shift_merchantId_startTime_idx" ON "Shift"("merchantId", "startTime");

-- CreateIndex
CREATE INDEX "StockAdjustment_merchantId_idx" ON "StockAdjustment"("merchantId");

-- CreateIndex
CREATE INDEX "StockAdjustment_merchantId_productId_idx" ON "StockAdjustment"("merchantId", "productId");

-- CreateIndex
CREATE INDEX "StockAdjustment_merchantId_createdAt_idx" ON "StockAdjustment"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "StockAdjustment_merchantId_type_idx" ON "StockAdjustment"("merchantId", "type");

-- CreateIndex
CREATE INDEX "StockCount_merchantId_idx" ON "StockCount"("merchantId");

-- CreateIndex
CREATE INDEX "StockCount_merchantId_productId_idx" ON "StockCount"("merchantId", "productId");

-- CreateIndex
CREATE INDEX "StockCount_merchantId_countDate_idx" ON "StockCount"("merchantId", "countDate");

-- CreateIndex
CREATE INDEX "User_merchantId_idx" ON "User"("merchantId");

-- CreateIndex
CREATE INDEX "User_merchantId_role_idx" ON "User"("merchantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "User_merchantId_email_key" ON "User"("merchantId", "email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySummary" ADD CONSTRAINT "DailySummary_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
