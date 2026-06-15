import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const categories = await prisma.expenseCategory.findMany({
    where:   { merchantId: session.merchantId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { expenses: true } } },
  });

  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, color } = await request.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  try {
    const category = await prisma.expenseCategory.create({
      data: { merchantId: session.merchantId, name, description, color },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002')
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
    throw e;
  }
}

// Seed default categories
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const defaults = [
    { name: 'Salaries & Wages',      color: '#6366f1', isSystem: true },
    { name: 'Rent & Utilities',      color: '#f59e0b', isSystem: true },
    { name: 'Office Supplies',       color: '#3b82f6', isSystem: true },
    { name: 'Travel & Transport',    color: '#ec4899', isSystem: true },
    { name: 'Stock Purchases',       color: '#8b5cf6', isSystem: true },
    { name: 'Marketing',             color: '#f97316', isSystem: true },
    { name: 'Equipment & Machinery', color: '#14b8a6', isSystem: true },
    { name: 'Repairs & Maintenance', color: '#84cc16', isSystem: true },
    { name: 'Insurance',             color: '#0ea5e9', isSystem: true },
    { name: 'Bank Charges',          color: '#94a3b8', isSystem: true },
    { name: 'Professional Fees',     color: '#a78bfa', isSystem: true },
    { name: 'Miscellaneous',         color: '#6b7280', isSystem: true },
  ];

  await prisma.expenseCategory.createMany({
    data:           defaults.map(d => ({ merchantId: session.merchantId, ...d })),
    skipDuplicates: true,
  });

  return NextResponse.json(
    await prisma.expenseCategory.findMany({
      where: { merchantId: session.merchantId },
      orderBy: { name: 'asc' },
    })
  );
}