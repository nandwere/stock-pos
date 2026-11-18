import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> }; // Next 14: { params: { id: string } }, no await

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { merchantId } = session;
    const { id } = await params;

    const url = new URL(request.url);
    const view = url.searchParams.get('view') === 'price' ? 'price' : 'stock';
    const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
    const pageSize = Math.min(100, Number(url.searchParams.get('pageSize') ?? 25));

    const product = await prisma.product.findFirst({
      where: { id, merchantId },
      select: { id: true, name: true, currentStock: true, costPrice: true, sellingPrice: true, unit: true },
    });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const where = { merchantId, productId: id };
    const args = {
      where,
      orderBy: { createdAt: 'desc' as const },
      take: pageSize,
      skip: page * pageSize,
      include: { user: { select: { name: true } } },
    };

    const [data, total] =
      view === 'price'
        ? await Promise.all([prisma.priceHistory.findMany(args), prisma.priceHistory.count({ where })])
        : await Promise.all([prisma.stockMovement.findMany(args), prisma.stockMovement.count({ where })]);

    return NextResponse.json({
      product, data,
      meta: { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (error) {
    console.error('Product history error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}