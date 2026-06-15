import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

async function getSupplier(merchantId: string, id: string) {
  return prisma.supplier.findFirst({ where: { id, merchantId } });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supplier = await prisma.supplier.findFirst({
    where:   { id: (await params).id, merchantId: session.merchantId },
    include: {
      expenses: {
        orderBy: { expenseDate: 'desc' },
        take:    10,
        select:  { id: true, expenseNumber: true, description: true, total: true, status: true, expenseDate: true },
      },
      products: {
        where:  { isActive: true },
        select: { id: true, name: true, sku: true, costPrice: true, currentStock: true },
      },
      _count:  { select: { expenses: true, products: true } },
    },
  });

  if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

  // Aggregate spend
  const totalSpend = await prisma.expense.aggregate({
    where:  { merchantId: session.merchantId, supplierId: (await params).id, status: 'PAID' },
    _sum:   { total: true },
    _count: true,
  });

  return NextResponse.json({
    ...supplier,
    totalSpend:    Number(totalSpend._sum.total ?? 0),
    paidExpenses:  totalSpend._count,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['OWNER', 'MANAGER'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supplier = await getSupplier(session.merchantId, (await params).id);
  if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

  const { name, email, phone, address, contactName, taxPin, notes, isActive } = await request.json();

  const updated = await prisma.supplier.update({
    where: { id: (await params).id },
    data:  { name, email, phone, address, contactName, taxPin, notes, isActive },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supplier = await getSupplier(session.merchantId, (await params).id);
  if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

  // Soft delete — don't break historical expense records
  await prisma.supplier.update({
    where: { id: (await params).id },
    data:  { isActive: false },
  });

  return new NextResponse(null, { status: 204 });
}