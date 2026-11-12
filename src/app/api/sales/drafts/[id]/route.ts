import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, getSession } from '@/lib/auth';
import { buildDraftItems, validateDraftBody } from '../route';

type Ctx = { params: Promise<{ id: string }> }; // Next 14: { params: { id: string } }, no await

async function authorize(id: string) {
  const session = await getSession();
  const user = await getCurrentUser();
  if (!session || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const draft = await prisma.draftSale.findFirst({
    where: { id, merchantId: session.merchantId },
  });
  if (!draft) return { error: NextResponse.json({ error: 'Draft not found' }, { status: 404 }) };
  if (user.role === 'CASHIER' && draft.userId !== user.id) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session, user, draft };
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (auth.error) return auth.error;

    const body = await request.json();
    const err = validateDraftBody(body);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const ids = body.items.map((i: any) => i.productId);
    const found = await prisma.product.count({
      where: { id: { in: ids }, merchantId: auth.session!.merchantId },
    });
    if (found !== new Set(ids).size) {
      return NextResponse.json({ error: 'One or more products not found' }, { status: 404 });
    }

    const { rows, subtotal, discount, total } = buildDraftItems(body.items);

    const updated = await prisma.$transaction(async (tx: { draftSaleItem: { deleteMany: (arg0: { where: { draftId: string; }; }) => any; }; draftSale: { update: (arg0: { where: { id: string; }; data: { customerName: any; customerPhone: any; notes: any; subtotal: number; discount: number; total: number; items: { create: { productId: any; quantity: any; unitPrice: any; discount: number; subtotal: number; }[]; }; }; include: { items: boolean; }; }) => any; }; }) => {
      await tx.draftSaleItem.deleteMany({ where: { draftId: id } });
      return tx.draftSale.update({
        where: { id },
        data: {
          customerName: body.customerName?.trim() || null,
          customerPhone: body.customerPhone?.trim() || null,
          notes: body.notes?.trim() || null,
          subtotal, discount, total,
          items: { create: rows },
        },
        include: { items: true },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update draft error:', error);
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (auth.error) return auth.error;

    await prisma.draftSale.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete draft error:', error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}