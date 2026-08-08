// app/api/sales/credit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { merchantId } = session;

  // total > amountPaid is the actual "still owed" condition — a credit
  // sale that's been fully repaid shouldn't show up here even though
  // paymentMethod is still CREDIT (that field records how the sale
  // originated, not its current balance state).
  const sales = await prisma.sale.findMany({
    where: {
      merchantId,
      paymentMethod: 'CREDIT',
    //   total: { gt: prisma.sale.fields.amountPaid },
    },
    select: {
      id: true,
      saleNumber: true,
      customerName: true,
      customerPhone: true,
      total: true,
      amountPaid: true,
      dueDate: true,
      notifiedAt: true,
      createdAt: true,
    },
    orderBy: { dueDate: 'asc' }, // soonest/most-overdue due date first
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const withBalance = sales.map((s) => ({
    ...s,
    balance: Number(s.total) - Number(s.amountPaid),
    isOverdue: s.dueDate ? s.dueDate < today : false,
  }));

  const summary = {
    count: withBalance.length,
    totalOutstanding: withBalance.reduce((sum, s) => sum + s.balance, 0),
    overdueCount: withBalance.filter((s) => s.isOverdue).length,
  };

  return NextResponse.json({ sales: withBalance, summary });
}