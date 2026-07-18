import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { merchantId } = session;
    const startTime = Date.now();
    console.info("[Dashboard] Request received");

    const user = await getCurrentUser();

    if (!user) {
      console.warn("[Dashboard] Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.info(`[Dashboard] User authenticated: ${user.id}`);

    // Dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dayBeforeYesterday = new Date(yesterday);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);

    // Sales
    console.info("[Dashboard] Fetching sales aggregates");

    const todaySales = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        merchantId,
      },
      _sum: { total: true },
      _count: true,
    });

    const yesterdaySales = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: yesterday, lt: today },
        merchantId,
      },
      _sum: { total: true },
    });

    const todayTotal = Number(todaySales._sum.total || 0);
    const yesterdayTotal = Number(yesterdaySales._sum.total || 0);

    const salesChange =
      yesterdayTotal > 0
        ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
        : todayTotal > 0
          ? 100
          : 0;

    console.info("[Dashboard] Sales calculated", {
      todayTotal,
      yesterdayTotal,
      salesChange,
    });

    // ── Daily profit ──────────────────────────────────────────────────────
    // SaleItem.costPrice is now snapshotted at sale-creation time, so this
    // is the primary cost source — accurate even if Product.costPrice
    // later changes. `item.product.costPrice` is only a fallback for rows
    // created before the snapshot existed (those defaulted to 0 in the
    // migration).
    //
    // A costPrice of exactly 0 is treated as "no snapshot" and triggers the
    // fallback, rather than trying to track an exact migration cutover
    // timestamp. The one edge case this doesn't handle correctly is a
    // genuinely free/zero-cost item sold AFTER the migration — it would
    // get repriced against the product's current cost too. That's a much
    // rarer case than "this row predates snapshotting," and understating
    // profit slightly is the safer direction to be wrong in vs. silently
    // overstating it for every un-migrated row.
    //
    // Using `subtotal` (not unitPrice * quantity) for revenue per line,
    // since that's whatever your sale-creation logic already decided this
    // line item is worth (net of its own per-line discount).
    //
    // NOTE: this is gross margin on goods sold — it does NOT add/subtract
    // `tax` (tax isn't merchant revenue, correctly excluded).
    console.info("[Dashboard] Fetching today's sale items for profit");

    const todaySaleItems = await prisma.saleItem.findMany({
      where: {
        sale: { createdAt: { gte: today, lt: tomorrow }, merchantId },
      },
      select: {
        quantity: true,
        subtotal: true,
        costPrice: true,
        product: { select: { costPrice: true } },
      },
    });

    const todayProfit = todaySaleItems.reduce((sum, item) => {
      const revenue = Number(item.subtotal);
      const snapshotCost = Number(item.costPrice);
      const costPerUnit = snapshotCost > 0 ? snapshotCost : Number(item.product.costPrice);
      const cost = costPerUnit * Number(item.quantity);
      return sum + (revenue - cost);
    }, 0);

    const yesterdaySaleItems = await prisma.saleItem.findMany({
      where: {
        sale: { createdAt: { gte: yesterday, lt: today }, merchantId },
      },
      select: {
        quantity: true,
        subtotal: true,
        costPrice: true,
        product: { select: { costPrice: true } },
      },
    });

    const yesterdayProfit = yesterdaySaleItems.reduce((sum, item) => {
      const revenue = Number(item.subtotal);
      const snapshotCost = Number(item.costPrice);
      const costPerUnit = snapshotCost > 0 ? snapshotCost : Number(item.product.costPrice);
      const cost = costPerUnit * Number(item.quantity);
      return sum + (revenue - cost);
    }, 0);

    const profitChange =
      yesterdayProfit > 0
        ? ((todayProfit - yesterdayProfit) / yesterdayProfit) * 100
        : todayProfit > 0
          ? 100
          : 0;

    console.info("[Dashboard] Profit calculated", { todayProfit, yesterdayProfit, profitChange });

    // merchantId filter present here — a prior version of this query was
    // missing it and counted low-stock products across every merchant.
    const lowStockItems = await prisma.product.count({
      where: {
        currentStock: { lte: prisma.product.fields.reorderLevel },
        isActive: true,
        merchantId,
      },
    });

    // ── Inventory value + stock profit ──────────────────────────────────
    // Both derive from the same product fetch — combined into one pass
    // instead of querying products twice.
    const products = await prisma.product.findMany({
      where: { isActive: true, merchantId },
      select: { currentStock: true, costPrice: true, sellingPrice: true },
    });

    let totalInventoryValue = 0;
    let stockProfit = 0; // potential profit if all current stock sold at current prices

    for (const product of products) {
      const stock = Number(product.currentStock);
      const cost = Number(product.costPrice);
      const price = Number(product.sellingPrice);
      totalInventoryValue += stock * cost;
      stockProfit += stock * (price - cost);
    }

    // Active workers
    const activeWorkers = await prisma.user.count({
      where: { isActive: true, merchantId },
    });

    // Week / Month sales
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date(today);
    monthStart.setDate(monthStart.getDate() - 30);

    const weekSales = await prisma.sale.aggregate({
      where: { createdAt: { gte: weekStart, lt: tomorrow }, merchantId },
      _sum: { total: true },
    });

    const monthSales = await prisma.sale.aggregate({
      where: { createdAt: { gte: monthStart, lt: tomorrow }, merchantId },
      _sum: { total: true },
    });

    const duration = Date.now() - startTime;

    console.info("[Dashboard] Response ready", {
      durationMs: duration,
    });

    return NextResponse.json({
      todaySales: todayTotal,
      salesCount: todaySales._count || 0,
      lowStockItems,
      totalInventoryValue,
      salesChange: Number(salesChange.toFixed(2)),
      activeWorkers,
      yesterdaySales: yesterdayTotal,
      weekSales: Number(weekSales._sum.total || 0),
      monthSales: Number(monthSales._sum.total || 0),
      todayProfit: Number(todayProfit.toFixed(2)),
      yesterdayProfit: Number(yesterdayProfit.toFixed(2)),
      profitChange: Number(profitChange.toFixed(2)),
      stockProfit: Number(stockProfit.toFixed(2)),
    });

  } catch (error: any) {
    console.error("[Dashboard] Error fetching stats", {
      message: error?.message,
      stack: error?.stack,
    });

    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}