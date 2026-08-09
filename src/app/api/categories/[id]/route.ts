import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasPermission } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { merchantId } = session;

    if (!(await hasPermission('products.create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.category.findFirst({ where: { id: params.id, merchantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (name != null && (typeof name !== 'string' || !name.trim())) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        ...(name != null && { name: name.trim() }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json(category);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 });
    }
    console.error('Categories PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { merchantId } = session;

    if (!(await hasPermission('products.create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.category.findFirst({
      where: { id: params.id, merchantId },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Product.category has no onDelete cascade in your schema (default
    // RESTRICT), so this would 500 as a raw P2003 without this check —
    // catch it here and give the cashier/owner something actionable instead.
    if (existing._count.products > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${existing._count.products} product(s) still use this category. Reassign them first.` },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Categories DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}