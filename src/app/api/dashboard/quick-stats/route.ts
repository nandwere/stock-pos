// /Users/flag/Desktop/stock-pos-system/src/app/api/dashboard/quick-stats/route.ts
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Quick stats for mini dashboard
    const [todayTransactions, totalProducts, outOfStock, activeWorkers] = await Promise.all([
      prisma.sale.count({
        where: {
          merchantId,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.product.count({
        where: {
          merchantId,
          isActive: true,
        },
      }),
      prisma.product.count({
        where: {
          merchantId,
          currentStock: 0,
          isActive: true,
        },
      }),
      prisma.user.count({
        where: {
          merchantId,
          isActive: true,
        },
      }),
    ]);

    return NextResponse.json({
      todayTransactions,
      totalProducts,
      outOfStock,
      activeWorkers,
    });
  } catch (error) {
    console.error('Quick stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quick stats' },
      { status: 500 }
    );
  }
}