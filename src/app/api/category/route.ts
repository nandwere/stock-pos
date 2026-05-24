// src/app/api/category/route.ts
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

    const where: any = { merchantId };
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
      prisma.category.findMany({
        where,
        orderBy: { name: 'asc' },
        take,
        skip
      }),
      prisma.category.count({ where }),
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
    // require create permission (owner)
    if (!(await hasPermission('category.create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { description, name } = body;

    if (!name || !description) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify the category belongs to this merchant before using it
    const categoryRecord = await prisma.category.findFirst({
      where: { name: name, merchantId },
    });
    if (categoryRecord) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: { merchantId, description, name },
      select: { id: true, name: true },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    // SKU collision is unique per merchant — surface it clearly
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 });
    }
    console.error('POST /api/categories', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}