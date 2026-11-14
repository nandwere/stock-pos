import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActor, getCurrentUser, getSession } from '@/lib/auth';

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function generateDraftNumber() {
  return `DRF-${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36).slice(2, 5).toUpperCase()}`;
}

// Shared by POST here and PUT in [id]/route.ts
export function validateDraftBody(body: any): string | null {
  if (!Array.isArray(body.items) || body.items.length === 0) return 'At least one item is required';
  for (const i of body.items) {
    if (!i.productId || typeof i.quantity !== 'number' || i.quantity <= 0)
      return 'Each item needs a productId and a positive quantity';
    if (typeof i.unitPrice !== 'number' || i.unitPrice < 0)
      return 'Each item needs a valid unitPrice';
    if (i.discount != null && (typeof i.discount !== 'number' || i.discount < 0))
      return 'discount must be a non-negative number';
  }
  return null;
}

export function buildDraftItems(items: any[]) {
  const rows = items.map(i => {
    const gross = round3(i.quantity * i.unitPrice);
    const discount = round3(i.discount ?? 0);
    return {
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount,
      subtotal: round3(gross - discount),
      _gross: gross,
    };
  });
  const subtotal = round3(rows.reduce((s, r) => s + r._gross, 0));
  const discount = round3(rows.reduce((s, r) => s + r.discount, 0));
  return {
    rows: rows.map(({ _gross, ...r }) => r),
    subtotal,
    discount,
    total: round3(subtotal - discount),
  };
}

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!actor.can('sales.create')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });


    const drafts = await prisma.draftSale.findMany({
      where: {
        merchantId: actor.merchantId,
        // Cashiers only see their own drafts; owners/managers see all
        ...(actor.can('sales.drafts.all') ? {} : { userId: actor.userId }),
      },
      include: {
        user: { select: { name: true } },
        items: {
          include: {
            product: {
              select: {
                id: true, name: true, sku: true, unit: true,
                isService: true, currentStock: true, sellingPrice: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(drafts);
  } catch (error) {
    console.error('Get drafts error:', error);
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { merchantId } = session;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const err = validateDraftBody(body);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const ids = body.items.map((i: any) => i.productId);
    const found = await prisma.product.count({ where: { id: { in: ids }, merchantId } });
    if (found !== new Set(ids).size) {
      return NextResponse.json({ error: 'One or more products not found' }, { status: 404 });
    }

    const { rows, subtotal, discount, total } = buildDraftItems(body.items);

    // No stock check or decrement — a draft doesn't reserve stock.
    const draft = await prisma.draftSale.create({
      data: {
        merchantId,
        userId: user.id,
        draftNumber: generateDraftNumber(),
        customerName: body.customerName?.trim() || null,
        customerPhone: body.customerPhone?.trim() || null,
        notes: body.notes?.trim() || null,
        subtotal, discount, total,
        items: { create: rows },
      },
      include: { items: true },
    });

    return NextResponse.json(draft, { status: 201 });
  } catch (error: any) {
    console.error('Create draft error:', error);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}