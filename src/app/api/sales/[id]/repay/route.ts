import { NextRequest, NextResponse } from 'next/server';
import { Prisma, PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, getSession } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> }; // Next 14: { params: { id: string } }, no await

class RepayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const REPAY_METHODS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CARD,
  PaymentMethod.MOBILE_MONEY,
];

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    const user = await getCurrentUser();
    if (!session || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { merchantId } = session;
    const { id } = await params;

    const body = await request.json();
    const rawAmount = Number(body.amount);
    const method: PaymentMethod = body.method ?? PaymentMethod.CASH;
    const reference = typeof body.reference === 'string' ? body.reference.trim().toUpperCase() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    if (!REPAY_METHODS.includes(method)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }
    const amount = new Prisma.Decimal(rawAmount);

    const result = await prisma.$transaction(
      async (tx) => {
        // Lock the sale row so two cashiers paying at once can't overpay.
        // (Table/column names are Prisma defaults; adjust if you use @@map.)
        await tx.$queryRaw`SELECT id FROM "Sale" WHERE id = ${id} AND "merchantId" = ${merchantId} FOR UPDATE`;

        const sale = await tx.sale.findFirst({ where: { id, merchantId } });
        if (!sale) throw new RepayError(404, 'Sale not found');
        if (sale.paymentMethod !== PaymentMethod.CREDIT) {
          throw new RepayError(400, 'Only credit sales can take repayments');
        }

        const balance = sale.total.minus(sale.amountPaid);
        if (balance.lte(0)) throw new RepayError(409, 'This sale is already fully paid');
        if (amount.gt(balance)) {
          throw new RepayError(400, `Amount exceeds outstanding balance of ${balance.toFixed(2)}`);
        }

        const newPaid = sale.amountPaid.plus(amount);
        const newBalance = sale.total.minus(newPaid);

        const payment = await tx.salePayment.create({
          data: {
            merchantId,
            saleId: id,
            userId: user.id,
            kind: 'REPAYMENT',
            method,
            amount,
            balanceAfter: newBalance,
            reference: reference || null,
            notes: notes || null,
          },
        });

        const updated = await tx.sale.update({
          where: { id },
          data: {
            amountPaid: newPaid,
            settledAt: newBalance.lte(0) ? new Date() : null,
          },
          select: { id: true, total: true, amountPaid: true, settledAt: true },
        });

        return { payment, sale: updated, balance: newBalance };
      },
      { maxWait: 10000, timeout: 15000 }
    );

    return NextResponse.json({
      payment: { ...result.payment, amount: Number(result.payment.amount), balanceAfter: Number(result.payment.balanceAfter) },
      sale: { id: result.sale.id, total: Number(result.sale.total), amountPaid: Number(result.sale.amountPaid), settledAt: result.sale.settledAt },
      balance: Number(result.balance),
    });
  } catch (error: any) {
    if (error instanceof RepayError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'This payment reference has already been recorded' }, { status: 409 });
    }
    console.error('Repay error:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}