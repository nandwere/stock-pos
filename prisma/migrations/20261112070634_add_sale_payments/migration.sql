-- CreateEnum
CREATE TYPE "SalePaymentKind" AS ENUM ('SALE', 'DEPOSIT', 'REPAYMENT');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "settledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SalePayment" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "userId" TEXT,
    "kind" "SalePaymentKind" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,3) NOT NULL,
    "balanceAfter" DECIMAL(10,3) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalePayment_merchantId_saleId_idx" ON "SalePayment"("merchantId", "saleId");

-- CreateIndex
CREATE INDEX "SalePayment_merchantId_createdAt_idx" ON "SalePayment"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "SalePayment_merchantId_method_createdAt_idx" ON "SalePayment"("merchantId", "method", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalePayment_merchantId_reference_key" ON "SalePayment"("merchantId", "reference");

-- CreateIndex
CREATE INDEX "Sale_merchantId_paymentMethod_settledAt_idx" ON "Sale"("merchantId", "paymentMethod", "settledAt");

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
