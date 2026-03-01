// /Users/flag/Desktop/stock-pos-system/src/app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.info("[Dashboard] Request received");

  try {
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
      },
      _sum: { total: true },
      _count: true,
    });

    const yesterdaySales = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: yesterday, lt: today },
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

    // Low stock
    const lowStockItems = await prisma.product.count({
      where: {
        currentStock: { lte: prisma.product.fields.reorderLevel },
        isActive: true,
      },
    });

    // Inventory value
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { currentStock: true, costPrice: true },
    });

    const totalInventoryValue = products.reduce((sum, product) => {
      return sum + Number(product.currentStock) * Number(product.costPrice);
    }, 0);

    // Active workers
    const activeWorkers = await prisma.user.count({
      where: { isActive: true },
    });

    // Week / Month sales
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date(today);
    monthStart.setDate(monthStart.getDate() - 30);

    const weekSales = await prisma.sale.aggregate({
      where: { createdAt: { gte: weekStart, lt: tomorrow } },
      _sum: { total: true },
    });

    const monthSales = await prisma.sale.aggregate({
      where: { createdAt: { gte: monthStart, lt: tomorrow } },
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