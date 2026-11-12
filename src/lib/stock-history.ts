import { Prisma, StockMovementType } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export class InsufficientStockError extends Error {
  constructor(public productName: string, public available: number, public requested: number) {
    super(`Insufficient stock for ${productName}. Available: ${available}, Requested: ${requested}`);
    this.name = 'InsufficientStockError';
  }
}

interface StockChangeArgs {
  merchantId: string;
  productId: string;
  userId?: string | null;
  type: StockMovementType;
  change: number | string | Prisma.Decimal; // signed: negative removes stock
  referenceType?: string;
  referenceId?: string;
  note?: string;
  allowNegative?: boolean; // default false
}

/**
 * The ONLY place product stock should be mutated. Updates currentStock and
 * writes the ledger row in the caller's transaction. Returns the new balance.
 */
export async function applyStockChange(tx: Tx, a: StockChangeArgs) {
  const delta = new Prisma.Decimal(a.change);

  const result = await tx.product.updateMany({
    where: {
      id: a.productId,
      merchantId: a.merchantId,
      // atomic guard against overselling, same pattern your sales route used
      ...(delta.isNegative() && !a.allowNegative ? { currentStock: { gte: delta.abs() } } : {}),
    },
    data: { currentStock: { increment: delta } },
  });

  if (result.count === 0) {
    const p = await tx.product.findFirst({
      where: { id: a.productId, merchantId: a.merchantId },
      select: { name: true, currentStock: true },
    });
    if (!p) throw new Error(`Product ${a.productId} not found`);
    throw new InsufficientStockError(p.name, Number(p.currentStock), delta.abs().toNumber());
  }

  // The row is locked by our update until commit, so this read is consistent.
  const { currentStock } = await tx.product.findUniqueOrThrow({
    where: { id: a.productId },
    select: { currentStock: true },
  });

  await tx.stockMovement.create({
    data: {
      merchantId: a.merchantId,
      productId: a.productId,
      userId: a.userId ?? null,
      type: a.type,
      quantityChange: delta,
      stockBefore: currentStock.minus(delta),
      stockAfter: currentStock,
      referenceType: a.referenceType,
      referenceId: a.referenceId,
      note: a.note,
    },
  });

  return currentStock;
}

interface PriceSnapshot {
  costPrice: Prisma.Decimal | number | string | null;
  sellingPrice: Prisma.Decimal | number | string | null;
}

/** Writes a PriceHistory row only if cost or selling price actually changed. */
export async function recordPriceChange(
  tx: Tx,
  a: {
    merchantId: string;
    productId: string;
    userId?: string | null;
    before: PriceSnapshot | null; // null = initial price on create
    after: { costPrice: Prisma.Decimal | number | string; sellingPrice: Prisma.Decimal | number | string };
    reason?: string;
  }
) {
  const newCost = new Prisma.Decimal(a.after.costPrice);
  const newSell = new Prisma.Decimal(a.after.sellingPrice);
  const oldCost = a.before?.costPrice != null ? new Prisma.Decimal(a.before.costPrice) : null;
  const oldSell = a.before?.sellingPrice != null ? new Prisma.Decimal(a.before.sellingPrice) : null;

  if (a.before && oldCost?.equals(newCost) && oldSell?.equals(newSell)) return null;

  return tx.priceHistory.create({
    data: {
      merchantId: a.merchantId,
      productId: a.productId,
      userId: a.userId ?? null,
      oldCostPrice: oldCost,
      newCostPrice: newCost,
      oldSellingPrice: oldSell,
      newSellingPrice: newSell,
      reason: a.reason,
    },
  });
}