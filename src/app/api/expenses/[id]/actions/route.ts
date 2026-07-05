import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, comment, paymentMethod, paymentReference } = await request.json();

  console.log('action:', action, 'comment:', comment, 'paymentMethod:', paymentMethod, 'paymentReference:', paymentReference);  

  const expense = await prisma.expense.findFirst({
    where: { id: (await params).id, merchantId: session.merchantId },
  });
  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

  switch (action) {

    case 'submit': {
      if (expense.status !== 'DRAFT')
        return NextResponse.json({ error: 'Only DRAFT expenses can be submitted' }, { status: 400 });
      return NextResponse.json(
        await prisma.expense.update({
          where: { id: (await params).id },
          data:  { status: 'SUBMITTED' },
        })
      );
    }

    case 'approve': {
      if (!['OWNER', 'MANAGER'].includes(session.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (expense.status !== 'SUBMITTED')
        return NextResponse.json({ error: 'Only SUBMITTED expenses can be approved' }, { status: 400 });

      const [updated] = await prisma.$transaction([
        prisma.expense.update({
          where: { id: (await params).id },
          data:  { status: 'APPROVED' },
        }),
        prisma.expenseApproval.create({
          data: {
            expenseId:  (await params).id,
            approverId: session.userId,
            status:     'APPROVED',
            comment,
            decidedAt:  new Date(),
          },
        }),
      ]);
      return NextResponse.json(updated);
    }

    case 'reject': {
      if (!['OWNER', 'MANAGER'].includes(session.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (!['SUBMITTED', 'APPROVED'].includes(expense.status))
        return NextResponse.json({ error: 'Cannot reject this expense' }, { status: 400 });

      const [updated] = await prisma.$transaction([
        prisma.expense.update({
          where: { id: (await params).id },
          data:  { status: 'REJECTED' },
        }),
        prisma.expenseApproval.create({
          data: {
            expenseId:  (await params).id,
            approverId: session.userId,
            status:     'REJECTED',
            comment,
            decidedAt:  new Date(),
          },
        }),
      ]);
      return NextResponse.json(updated);
    }

    case 'pay': {
      if (!['OWNER', 'MANAGER'].includes(session.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (expense.status !== 'APPROVED')
        return NextResponse.json({ error: 'Only APPROVED expenses can be marked as paid' }, { status: 400 });
      if (!paymentMethod)
        return NextResponse.json({ error: 'paymentMethod is required' }, { status: 400 });

      return NextResponse.json(
        await prisma.expense.update({
          where: { id: (await params).id },
          data:  {
            status:           'PAID',
            paidAt:           new Date(),
            paymentMethod,
            paymentReference: paymentReference || null,
          },
        })
      );
    }

    case 'void': {
      if (session.role !== 'OWNER')
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (expense.status === 'PAID')
        return NextResponse.json({ error: 'Cannot void a paid expense' }, { status: 400 });

      return NextResponse.json(
        await prisma.expense.update({
          where: { id: (await params).id },
          data:  { status: 'VOIDED' },
        })
      );
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}