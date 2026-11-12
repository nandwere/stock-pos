import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { merchantId } = session;

    const status = new URL(request.url).searchParams.get('status') ?? 'open'; // open | settled | all

    const sales = await prisma.sale.findMany({
      where: {
        merchantId,
        paymentMethod: 'CREDIT',
        ...(status === 'open' ? { settledAt: null } : {}),
        ...(status === 'settled' ? { settledAt: { not: null } } : {}),
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
        settledAt: true,
        createdAt: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, kind: true, method: true, amount: true,
            balanceAfter: true, reference: true, notes: true, createdAt: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: status === 'settled' ? { settledAt: 'desc' } : { dueDate: 'asc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const withBalance = sales.map((s) => {
      const balance = Number(s.total) - Number(s.amountPaid);
      const isSettled = s.settledAt !== null;
      return {
        ...s,
        total: Number(s.total),
        amountPaid: Number(s.amountPaid),
        payments: s.payments.map((p) => ({
          ...p,
          amount: Number(p.amount),
          balanceAfter: Number(p.balanceAfter),
        })),
        balance,
        isSettled,
        isOverdue: !isSettled && s.dueDate ? s.dueDate < today : false,
      };
    });

    const open = withBalance.filter((s) => !s.isSettled);
    const summary = {
      count: open.length,
      totalOutstanding: open.reduce((sum, s) => sum + s.balance, 0),
      overdueCount: open.filter((s) => s.isOverdue).length,
    };

    return NextResponse.json({ sales: withBalance, summary });
  } catch (error) {
    console.error('Credit sales error:', error);
    return NextResponse.json({ error: 'Failed to fetch credit sales' }, { status: 500 });
  }
}