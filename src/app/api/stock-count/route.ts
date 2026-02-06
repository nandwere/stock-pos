import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const body = await request.json();
    console.log(body)
    const { counts } = body;

    const results = await prisma.$transaction(
      counts.map((count: any) =>
        prisma.stockCount.create({
          data: {
            productId: count.productId,
            userId: user.id,
            expectedQty: count.expectedStock,
            actualQty: count.actualStock,
            variance: count.actualStock - count.expectedStock,
            notes: count.notes
          }
        })
      )
    );

    // Update product stock levels
    await Promise.all(
      counts.map((count: any) =>
        prisma.product.update({
          where: { id: count.productId },
          data: { currentStock: count.actualStock }
        })
      )
    );

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    console.error('Stock count error:', error);
    return NextResponse.json(
      { error: 'Failed to save stock count' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date'); // ISO date or undefined => today
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const where: any = {};
    if (date) {
      const d = new Date(date);
      const start = new Date(d.toISOString().slice(0, 10));
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.countDate = { gte: start, lt: end };
    } else if (startDate || endDate) {
      where.countDate = {};
      if (startDate) where.countDate.gte = new Date(startDate);
      if (endDate) where.countDate.lte = new Date(endDate);
    }

    const counts = await prisma.stockCount.findMany({
      where,
      include: { product: true, user: true },
      orderBy: { countDate: 'desc' },
      take: 1000
    });

    return NextResponse.json({ data: counts });
  } catch (error) {
    console.error('Stock count GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch stock counts' }, { status: 500 });
  }
}