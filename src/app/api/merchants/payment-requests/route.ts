import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActor, getSession } from '@/lib/auth';
import { getPlan } from '@/lib/plans.server';

// All merchants' plan payment requests. Super admin only.
export async function GET(request: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!actor.can('merchants.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  const plan = url.searchParams.get('plan');
  const take = Math.min(Number(url.searchParams.get('take') ?? 200), 500);
  const skip = Number(url.searchParams.get('skip') ?? 0);

  const where: any = {};
  if (q) {
    where.OR = [
      { transactionCode: { contains: q, mode: 'insensitive' } },
      { merchant: { name: { contains: q, mode: 'insensitive' } } },
      { merchant: { slug: { contains: q, mode: 'insensitive' } } },
    ];
  }
  if (plan && plan !== 'all') where.plan = plan;

  const [data, total] = await Promise.all([
    prisma.paymentRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: { merchant: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.paymentRequest.count({ where }),
  ]);

  return NextResponse.json({ data, meta: { total, take, skip } });
}

// A merchant submits an M-Pesa code for a plan upgrade.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const planKey = typeof body?.plan === 'string' ? body.plan : '';
  const transactionCode = typeof body?.transactionCode === 'string' ? body.transactionCode.trim().toUpperCase() : '';

  if (!planKey || !transactionCode) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!/^[A-Z0-9]{10}$/.test(transactionCode)) {
    return NextResponse.json({ error: 'Transaction codes are 10 characters, e.g. QHK2XY1234' }, { status: 400 });
  }

  const plan = await getPlan(planKey);
  if (!plan || !plan.isActive || !plan.isPublic || plan.contactOnly || plan.price <= 0) {
    return NextResponse.json({ error: 'That plan cannot be purchased online' }, { status: 400 });
  }

  try {
    await prisma.paymentRequest.create({
      data: { merchantId: session.merchantId, plan: plan.key, transactionCode, status: 'PENDING' },
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'This transaction code has already been submitted' }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ success: true });
}
