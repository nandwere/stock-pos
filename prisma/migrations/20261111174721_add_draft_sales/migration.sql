-- CreateTable
CREATE TABLE "DraftSale" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "draftNumber" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "notes" TEXT,
    "subtotal" DECIMAL(10,3) NOT NULL,
    "discount" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftSaleItem" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(10,3) NOT NULL,
    "discount" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "DraftSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DraftSale_merchantId_userId_idx" ON "DraftSale"("merchantId", "userId");

-- CreateIndex
CREATE INDEX "DraftSale_merchantId_updatedAt_idx" ON "DraftSale"("merchantId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DraftSale_merchantId_draftNumber_key" ON "DraftSale"("merchantId", "draftNumber");

-- CreateIndex
CREATE INDEX "DraftSaleItem_draftId_idx" ON "DraftSaleItem"("draftId");

-- CreateIndex
CREATE INDEX "DraftSaleItem_productId_idx" ON "DraftSaleItem"("productId");

-- AddForeignKey
ALTER TABLE "DraftSale" ADD CONSTRAINT "DraftSale_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftSale" ADD CONSTRAINT "DraftSale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftSaleItem" ADD CONSTRAINT "DraftSaleItem_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "DraftSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftSaleItem" ADD CONSTRAINT "DraftSaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
