// app/api/stock-counts/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { startDate, endDate } = body;

    // Validate dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Parse date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch stock counts with related data
    const stockCounts = await prisma.stockCount.findMany({
      where: {
        countDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            sellingPrice: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        countDate: 'desc',
      },
    });

    // Transform data for frontend
    const reports = stockCounts.map(count => {
      const expectedQty = Number(count.expectedQty);
      const actualQty = Number(count.actualQty);
      const variance = Number(count.variance);
      const productPrice = count.product?.sellingPrice ? Number(count.product.sellingPrice) : 0;
      
      const missingStock = variance < 0 ? Math.abs(variance) : 0;
      const excessStock = variance > 0 ? variance : 0;
      const estimatedLoss = missingStock * productPrice;

      return {
        id: count.id,
        productId: count.productId,
        productName: count.product?.name,
        productSku: count.product?.sku,
        userName: count.user?.name,
        expectedQty,
        actualQty,
        variance,
        totalVariance: variance, // For aggregate
        missingStock,
        excessStock,
        estimatedLoss,
        productsCounted: 1,
        productsWithVariance: variance !== 0 ? 1 : 0,
        notes: count.notes,
        countDate: count.countDate,
        // Optional: include full objects if needed
        product: count.product,
        user: count.user,
      };
    });

    return NextResponse.json(reports);
    
  } catch (error) {
    console.error('Error fetching stock count reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}