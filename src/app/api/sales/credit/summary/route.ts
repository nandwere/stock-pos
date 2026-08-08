// app/api/sales/credit/summary/route.ts — lighter than the full list, just for the badge
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueCount = await prisma.sale.count({
    where: {
      merchantId: session.merchantId,
      paymentMethod: 'CREDIT',
      total: { gt: prisma.sale.fields.amountPaid },
      dueDate: { lt: today },
    },
  });

  return NextResponse.json({ overdueCount });
}