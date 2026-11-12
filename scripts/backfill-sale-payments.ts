// scripts/backfill-sale-payments.ts — run once: npx tsx scripts/backfill-sale-payments.ts
import { prisma } from '../src/lib/prisma';

async function main() {
  const sales = await prisma.sale.findMany({
    where: { payments: { none: {} }, amountPaid: { gt: 0 } },
    select: { id: true, merchantId: true, userId: true, paymentMethod: true, total: true, amountPaid: true, createdAt: true },
  });

  for (const s of sales) {
    const isCredit = s.paymentMethod === 'CREDIT';
    await prisma.salePayment.create({
      data: {
        merchantId: s.merchantId,
        saleId: s.id,
        userId: s.userId,
        kind: isCredit ? 'DEPOSIT' : 'SALE',
        method: isCredit ? 'CASH' : s.paymentMethod,
        amount: s.amountPaid,
        balanceAfter: s.total.minus(s.amountPaid),
        notes: isCredit ? 'Backfilled: total paid before payment tracking (method unknown)' : null,
        createdAt: s.createdAt,
      },
    });
  }

  // Mark fully-paid credit sales as settled. Prisma can't compare two columns, so raw SQL.
  const settled = await prisma.$executeRaw`
    UPDATE "Sale" SET "settledAt" = NOW()
    WHERE "paymentMethod" = 'CREDIT' AND "settledAt" IS NULL AND "amountPaid" >= "total"
  `;

  console.log(`Backfilled ${sales.length} payments, marked ${settled} credit sales settled`);
}

main().finally(() => prisma.$disconnect());