-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);
