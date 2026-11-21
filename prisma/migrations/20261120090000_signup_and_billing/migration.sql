-- Self-signup + platform billing (invoices, receipts, plan expiry)

-- Merchant: billing lifecycle + email verification
ALTER TABLE "Merchant"
  ADD COLUMN "planExpiresAt" TIMESTAMP(3),
  ADD COLUMN "planIsTrial"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "billingNotice" TEXT,
  ADD COLUMN "verifiedAt"    TIMESTAMP(3);

-- Every merchant that exists today counts as verified
UPDATE "Merchant" SET "verifiedAt" = "createdAt";
-- The old trial column becomes a trial expiry
UPDATE "Merchant" SET "planExpiresAt" = "trialEndsAt", "planIsTrial" = true WHERE "trialEndsAt" IS NOT NULL;

-- Plan: optional free trial for new sign-ups
ALTER TABLE "Plan" ADD COLUMN "trialDays" INTEGER NOT NULL DEFAULT 0;

-- Invoices
CREATE TYPE "InvoiceStatus" AS ENUM ('OPEN', 'PAID', 'VOID');

CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "periodMonths" INTEGER NOT NULL DEFAULT 1,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "receiptNumber" TEXT,
    "paymentRef" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE UNIQUE INDEX "Invoice_receiptNumber_key" ON "Invoice"("receiptNumber");
CREATE INDEX "Invoice_merchantId_status_idx" ON "Invoice"("merchantId", "status");
CREATE INDEX "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_plan_fkey" FOREIGN KEY ("plan") REFERENCES "Plan"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Counters for invoice / receipt numbers
CREATE TABLE "BillingCounter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BillingCounter_pkey" PRIMARY KEY ("key")
);

-- PaymentRequest -> Invoice
ALTER TABLE "PaymentRequest" ADD COLUMN "invoiceId" TEXT;
CREATE INDEX "PaymentRequest_invoiceId_idx" ON "PaymentRequest"("invoiceId");
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
