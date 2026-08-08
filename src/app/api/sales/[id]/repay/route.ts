// app/api/sales/[id]/repay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { merchantId } = session;
  const { id } = await params;

  const body = await request.json();
  const amount = body.amount;

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      // Lock-and-check in one round trip via the WHERE clause, same pattern
      // as the stock decrement: the update itself is the concurrency guard,
      // not a separate read-then-write. Two simultaneous partial payments
      // for the same sale can't both push amountPaid past total.
      const existing = await tx.sale.findFirst({
        where: { id: id, merchantId },
        select: { total: true, amountPaid: true, paymentMethod: true },
      });

      if (!existing) {
        throw new NotFoundError();
      }
      console.log(existing);
      if (existing.paymentMethod !== 'CREDIT') {
        throw new ValidationError('Only credit sales accept repayments');
      }

      const currentBalance = Number(existing.total) - Number(existing.amountPaid);
      if (amount > currentBalance) {
        throw new ValidationError(`Payment (${amount}) exceeds outstanding balance (${currentBalance})`);
      }

      const newAmountPaid = Number(existing.amountPaid) + amount;
      const fullySettled = newAmountPaid >= Number(existing.total);

      const updated = await tx.sale.update({
        where: { id: id },
        data: {
          amountPaid: newAmountPaid,
          // Once fully settled there's nothing left to remind anyone about —
          // clearing notifiedAt here isn't for the cron's sake (the balance
          // filter already excludes settled sales) but keeps the field
          // meaningful if you ever add a "reopen sale" / refund path later,
          // rather than leaving a stale timestamp on a closed account.
          ...(fullySettled && { notifiedAt: null }),
        },
      });

      return updated;
    });

    return NextResponse.json(sale);
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Repayment error:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}

class NotFoundError extends Error {}
class ValidationError extends Error {}