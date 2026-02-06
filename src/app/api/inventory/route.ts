// src/app/api/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim();
    const category = url.searchParams.get('category');
    const stock = url.searchParams.get('stock'); // 'low' | 'out' | undefined
    const take = Number(url.searchParams.get('take') ?? 100);
    const skip = Number(url.searchParams.get('skip') ?? 0);

    const where: any = {};
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
      }),
      prisma.product.count({ where }),
    ]);
    return NextResponse.json({ data: data || [], meta: { total } });
  } catch (error) {
    console.error('Inventory GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // require create permission (owner)
  if (!(await hasPermission('products.create'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { description, name, sku, category, costPrice, sellingPrice, currentStock, reorderLevel, unit, isActive } = body;

    if (!category || !name || !costPrice || !sellingPrice || !currentStock || !unit) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // const existing = await prisma.product.findUnique({ where: {  } });
    // if (existing) {
    //   return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    // }


    const product = await prisma.product.create({
      data: { description, name, categoryId: category, sku, costPrice, sellingPrice, currentStock, reorderLevel, unit, isActive },
      select: { id: true, sku: true, name: true, costPrice: true, sellingPrice: true, currentStock: true, unit: true, isActive: true, createdAt: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('POST /api/users', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}