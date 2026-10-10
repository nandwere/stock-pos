-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "storefrontAddress" TEXT,
ADD COLUMN     "storefrontEmail" TEXT,
ADD COLUMN     "storefrontHours" TEXT,
ADD COLUMN     "storefrontLat" DECIMAL(9,6),
ADD COLUMN     "storefrontLng" DECIMAL(9,6),
ADD COLUMN     "storefrontPhone" TEXT,
ADD COLUMN     "storefrontWhatsapp" TEXT;
