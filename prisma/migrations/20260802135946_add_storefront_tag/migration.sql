-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "deliveryFee" DECIMAL(10,3) NOT NULL DEFAULT 0,
ADD COLUMN     "storefrontTagline" TEXT;
