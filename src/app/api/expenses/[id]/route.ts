import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const expense = await prisma.expense.findFirst({
    where: { id: (await params).id, merchantId: session.merchantId },
    include: {
      supplier: { select: { id: true, name: true, email: true, phone: true } },
      category: { select: { id: true, name: true, color: true } },
      user: { select: { id: true, name: true } },
      items: true,
      approvals: {
        include: { approver: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  return NextResponse.json(expense);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const expense = await prisma.expense.findFirst({
    where: { id: (await params).id, merchantId: session.merchantId },
  });
  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

  if (!['DRAFT', 'REJECTED'].includes(expense.status))
    return NextResponse.json({ error: 'Only DRAFT or REJECTED expenses can be edited' }, { status: 400 });

  const body = await request.json();
  const { items, ...data } = body;

  const updated = await prisma.expense.update({
    where: { id: (await params).id },
    data: {
      ...data,
      ...(data.expenseDate && { expenseDate: new Date(data.expenseDate) }),
      ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
      // Recalculate total if amount or tax changed
      ...(data.amount !== undefined && {
        total: Number(data.amount) + Number(data.tax ?? expense.tax),
      }),
      // Replace items if provided
      ...(items && {
        items: {
          deleteMany: {},
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: Number(item.quantity) * Number(item.unitPrice),
          })),
        },
      }),
    },
    include: { supplier: true, category: true, items: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const expense = await prisma.expense.findFirst({
    where: { id: (await params).id, merchantId: session.merchantId },
  });
  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  if (expense.status === 'PAID')
    return NextResponse.json({ error: 'Cannot delete a paid expense' }, { status: 400 });

  await prisma.expense.delete({ where: { id: (await params).id } });
  return new NextResponse(null, { status: 204 });
}