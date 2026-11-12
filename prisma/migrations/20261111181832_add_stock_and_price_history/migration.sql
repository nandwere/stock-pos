-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('OPENING', 'RESTOCK', 'SALE', 'RETURN', 'ADJUSTMENT_ADD', 'ADJUSTMENT_REMOVE', 'DAMAGE', 'THEFT', 'EXPIRY', 'CORRECTION', 'COUNT', 'MANUAL_EDIT');

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "StockMovementType" NOT NULL,
    "quantityChange" DECIMAL(10,3) NOT NULL,
    "stockBefore" DECIMAL(10,3) NOT NULL,
    "stockAfter" DECIMAL(10,3) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "oldCostPrice" DECIMAL(10,3),
    "newCostPrice" DECIMAL(10,3) NOT NULL,
    "oldSellingPrice" DECIMAL(10,3),
    "newSellingPrice" DECIMAL(10,3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_merchantId_productId_createdAt_idx" ON "StockMovement"("merchantId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_merchantId_createdAt_idx" ON "StockMovement"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_referenceType_referenceId_idx" ON "StockMovement"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "PriceHistory_merchantId_productId_createdAt_idx" ON "PriceHistory"("merchantId", "productId", "createdAt");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
