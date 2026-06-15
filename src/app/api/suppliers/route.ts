import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url      = new URL(request.url);
  const search   = url.searchParams.get('q')?.trim();
  const isActive = url.searchParams.get('active');
  const take     = Number(url.searchParams.get('take') ?? 50);
  const skip     = Number(url.searchParams.get('skip') ?? 0);

  const where: any = {
    merchantId: session.merchantId,
    ...(isActive !== null && { isActive: isActive === 'true' }),
    ...(search && {
      OR: [
        { name:        { contains: search, mode: 'insensitive' } },
        { email:       { contains: search, mode: 'insensitive' } },
        { phone:       { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      take, skip,
      include: {
        _count: { select: { expenses: true, products: true } },
      },
    }),
    prisma.supplier.count({ where }),
  ]);

  return NextResponse.json({ data, meta: { total, take, skip } });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['OWNER', 'MANAGER'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, email, phone, address, contactName, taxPin, notes } = await request.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  try {
    const supplier = await prisma.supplier.create({
      data: {
        merchantId: session.merchantId,
        name, email, phone, address, contactName, taxPin, notes,
      },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002')
      return NextResponse.json({ error: 'Supplier with this name already exists' }, { status: 409 });
    throw e;
  }
}