// app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderError } from '@/lib/orderService';
import { requireStaffUser } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    const staff = await requireStaffUser(req);

    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status') ?? undefined;
    const page = Number(searchParams.get('page') ?? '1');
    const limit = Number(searchParams.get('limit') ?? '25');

    const where = {
      merchantId: staff.merchantId,
      ...(status ? { status: status as any } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: { include: { product: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(1, page) - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({ data, total });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[admin orders list]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
