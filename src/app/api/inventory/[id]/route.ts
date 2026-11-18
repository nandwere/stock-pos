// app/api/sales/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { applyStockChange, recordPriceChange } from '@/lib/stock-history';
import { Prisma } from '@prisma/client';

// GET single sale
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { merchantId } = session;


    // Await the params Promise
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id, merchantId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT/UPDATE inventory item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { merchantId } = session;
    const user = await getCurrentUser();

    const { id } = await params;
    const body = await request.json();
    const existingProduct = await prisma.product.findUnique({
      where: { id, merchantId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
      }
    });
    const { categoryId, ...updateData } = body;
    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId, merchantId },
      include: {
      }
    });

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const before = await tx.product.findFirst({
        where: { id, merchantId },
        select: { costPrice: true, sellingPrice: true, currentStock: true, isService: true },
      });
      if (!before) throw new Error('NOT_FOUND');

      const { currentStock, priceChangeReason, ...fields } = body; // strip stock from the plain update
      const product = await tx.product.update({ where: { id }, data: fields });

      await recordPriceChange(tx, {
        merchantId, productId: id, userId: user?.id,
        before: { costPrice: before.costPrice, sellingPrice: before.sellingPrice },
        after: { costPrice: product.costPrice, sellingPrice: product.sellingPrice },
        reason: priceChangeReason,
      });

      // If the edit form changes stock, log it as a delta
      if (currentStock != null && !before.isService) {
        const delta = new Prisma.Decimal(currentStock).minus(before.currentStock);
        if (!delta.isZero()) {
          await applyStockChange(tx, {
            merchantId, productId: id, userId: user?.id,
            type: 'MANUAL_EDIT', change: delta, allowNegative: true,
            note: 'Edited from product form',
          });
        }
      }

      return tx.product.findUniqueOrThrow({ where: { id } });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { merchantId } = session;

    const { id } = await params;

    await prisma.product.delete({
      where: { id, merchantId }
    });

    return NextResponse.json(
      { message: 'Product deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}