// src/app/api/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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