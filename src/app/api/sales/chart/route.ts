// /Users/flag/Desktop/stock-pos-system/src/app/api/sales/chart/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const days = Number(url.searchParams.get('days') ?? 7);

    // Get date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    // Fetch sales grouped by date
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        total: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group sales by date
    const chartData: { [key: string]: number } = {};

    // Initialize all dates with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      chartData[dateKey] = 0;
    }

    // Aggregate sales by date
    sales.forEach(sale => {
      const dateKey = sale.createdAt.toISOString().split('T')[0];
      chartData[dateKey] = (chartData[dateKey] || 0) + Number(sale.total);
    });

    // Convert to array format
    const result = Object.entries(chartData).map(([date, amount]) => ({
      date,
      amount,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Sales chart error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales chart data' },
      { status: 500 }
    );
  }
}