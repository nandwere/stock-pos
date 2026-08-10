// src/app/api/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { merchantId } = session;
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim();
    const category = url.searchParams.get('category');
    const stock = url.searchParams.get('stock'); // 'low' | 'out' | undefined
    const take = Number(url.searchParams.get('take') ?? 100);
    const skip = Number(url.searchParams.get('skip') ?? 0);

    const where: any = {
      merchantId,
    };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (stock === 'low') where.currentStock = { lte: Number(url.searchParams.get('reorder') ?? 0) };
    if (stock === 'out') where.currentStock = { equals: 0 };

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        take,
        skip,
        include: {
          // Assuming you have a Category model relation
          category: true, // This will include the full category object
        },
      },),
      prisma.product.count({ where }),
    ]);
    return NextResponse.json({ data: data || [], meta: { total } });
  } catch (error) {
    console.error('Inventory GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { merchantId } = session;

    // Catches exactly the case that produced this error — a session that
    // exists but doesn't carry merchantId — before it reaches Prisma as a
    // confusing "Argument `merchant` is missing" instead of this clear one.
    if (!merchantId) {
      console.error('Session missing merchantId:', session);
      return NextResponse.json({ error: 'Session is missing merchant context' }, { status: 401 });
    }

    // require create permission (owner)
    if (!(await hasPermission('products.create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { description, name, sku, category, costPrice, sellingPrice, currentStock, reorderLevel, unit, isActive, showOnStorefront, isService } = body;

    const isServiceItem = Boolean(isService);

    if (!category || !name || costPrice == null || sellingPrice == null || !unit || (!isServiceItem && currentStock == null)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify the category belongs to this merchant before using it
    const categoryRecord = await prisma.category.findFirst({
      where: { id: category, merchantId },
    });

    const merchantRecord = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchantRecord) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }
    console.log('Category record:', categoryRecord);

    if (!categoryRecord) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    console.log('merchantId at create:', JSON.stringify(merchantId), typeof merchantId);

    const product = await prisma.product.create({
      data: {
        name,
        description,
        sku,
        costPrice,
        sellingPrice,
        currentStock: isServiceItem ? 0 : currentStock, // If it's a service item, set stock to 0
        reorderLevel: isServiceItem ? 0 : reorderLevel, // If it's a service item, set reorder level to 0
        unit,
        isActive,
        showOnStorefront,
        isService: isServiceItem,

        merchant: {
          connect: {
            id: merchantId,
          },
        },

        category: {
          connect: {
            id: category,
          },
        },
      },

      select: {
        id: true,
        sku: true,
        name: true,
        costPrice: true,
        sellingPrice: true,
        currentStock: true,
        unit: true,
        isActive: true,
        showOnStorefront: true,
        isService: true,
        createdAt: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    // SKU collision is unique per merchant — surface it clearly
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A product with this SKU already exists' }, { status: 409 });
    }
    console.error('POST /api/users', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}