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

    // Product count per category — lets the UI warn before a delete that
    // would hit the FK constraint on Product.categoryId
    const categories = await prisma.category.findMany({
      where: { merchantId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('Categories GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { merchantId } = session;

    if (!(await hasPermission('products.create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: { merchantId, name: name.trim(), description: description || undefined },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    // Category.name is @unique globally in your schema (not just per-merchant
    // despite the @@unique([merchantId, name]) also present) — either
    // constraint firing lands here as P2002
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 });
    }
    console.error('Categories POST error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}