import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  console.log('Session:', session);

  // Only OWNERs on the platform-level can list all merchants.
  // Adjust this guard to however you model super-admins.
  if (session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  const plan = url.searchParams.get('plan');
  const take = Number(url.searchParams.get('take') ?? 50);
  const skip = Number(url.searchParams.get('skip') ?? 0);

  const where: any = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (plan && plan !== 'all') where.plan = plan;

  const [data, total] = await Promise.all([
    prisma.paymentRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
       
      },
    }),
    prisma.paymentRequest.count({ where }),
  ]);

  return NextResponse.json({ data, meta: { total, take, skip } });
}


export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan, transactionCode } = await request.json();

  if (!plan || !transactionCode) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Reject duplicate transaction codes across all merchants
  const existing = await prisma.paymentRequest.findUnique({
    where: { transactionCode },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'This transaction code has already been submitted' },
      { status: 409 }
    );
  }

  await prisma.paymentRequest.create({
    data: {
      merchantId:      session.merchantId,
      plan,
      transactionCode,
      status:          'PENDING',
    },
  });

  return NextResponse.json({ success: true });
}