// scripts/backfill-history.ts — run once with: npx tsx scripts/backfill-history.ts
import { prisma } from '../src/lib/prisma';

async function main() {
  const products = await prisma.product.findMany({
    where: { stockMovements: { none: {} } },
    select: { id: true, merchantId: true, currentStock: true, costPrice: true, sellingPrice: true, isService: true },
  });

  for (const p of products) {
    await prisma.$transaction([
      ...(p.isService ? [] : [prisma.stockMovement.create({
        data: {
          merchantId: p.merchantId, productId: p.id, type: 'OPENING',
          quantityChange: p.currentStock, stockBefore: 0, stockAfter: p.currentStock,
          note: 'Backfilled opening balance',
        },
      })]),
      prisma.priceHistory.create({
        data: {
          merchantId: p.merchantId, productId: p.id,
          newCostPrice: p.costPrice, newSellingPrice: p.sellingPrice,
          reason: 'Backfilled initial price',
        },
      }),
    ]);
  }
  console.log(`Backfilled ${products.length} products`);
}

main().finally(() => prisma.$disconnect());