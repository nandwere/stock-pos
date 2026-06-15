import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function generateExpenseNumber(): string {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `EXP-${ts}-${rnd}`;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url        = new URL(request.url);
  const search     = url.searchParams.get('q')?.trim();
  const status     = url.searchParams.get('status');
  const type       = url.searchParams.get('type');
  const supplierId = url.searchParams.get('supplierId');
  const categoryId = url.searchParams.get('categoryId');
  const startDate  = url.searchParams.get('startDate');
  const endDate    = url.searchParams.get('endDate');
  const take       = Number(url.searchParams.get('take') ?? 20);
  const skip       = Number(url.searchParams.get('skip') ?? 0);

  const where: any = {
    merchantId: session.merchantId,
    ...(status     && { status }),
    ...(type       && { type }),
    ...(supplierId && { supplierId }),
    ...(categoryId && { categoryId }),
    ...((startDate || endDate) && {
      expenseDate: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate   && { lte: new Date(endDate)   }),
      },
    }),
    ...(search && {
      OR: [
        { expenseNumber: { contains: search, mode: 'insensitive' } },
        { description:   { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [data, total, summary] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      take, skip,
      include: {
        supplier: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        user:     { select: { id: true, name: true } },
        _count:   { select: { items: true, approvals: true } },
      },
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({
      where,
      _sum:   { total: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    data,
    meta: {
      total,
      take,
      skip,
      totalAmount: Number(summary._sum.total ?? 0),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['OWNER', 'MANAGER'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const {
    description, amount, tax = 0, type = 'OPERATIONAL',
    supplierId, categoryId, expenseDate, dueDate,
    paymentMethod, paymentReference, notes,
    isRecurring, recurringDay, tags = [], items = [],
  } = body;

  if (!description || !amount || !expenseDate)
    return NextResponse.json({ error: 'description, amount and expenseDate are required' }, { status: 400 });

  const total          = Number(amount) + Number(tax);
  const expenseNumber  = generateExpenseNumber();

  const expense = await prisma.expense.create({
    data: {
      merchantId:   session.merchantId,
      userId:       session.userId,
      expenseNumber,
      description,
      type,
      status:       'DRAFT',
      amount,
      tax,
      total,
      currency:     'KES',
      expenseDate:  new Date(expenseDate),
      dueDate:      dueDate ? new Date(dueDate) : null,
      supplierId:   supplierId || null,
      categoryId:   categoryId || null,
      paymentMethod: paymentMethod || null,
      paymentReference: paymentReference || null,
      notes,
      isRecurring,
      recurringDay,
      tags,
      // Create line items if provided
      items: items.length > 0 ? {
        create: items.map((item: any) => ({
          description: item.description,
          quantity:    item.quantity,
          unitPrice:   item.unitPrice,
          subtotal:    Number(item.quantity) * Number(item.unitPrice),
        })),
      } : undefined,
    },
    include: {
      supplier: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      items:    true,
    },
  });

  return NextResponse.json(expense, { status: 201 });
}