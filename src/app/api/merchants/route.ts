import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasPermission } from '@/lib/auth';
import bcrypt from 'bcryptjs';

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
    prisma.merchant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        _count: {
          select: { users: true, products: true, sales: true },
        },
      },
    }),
    prisma.merchant.count({ where }),
  ]);

  return NextResponse.json({ data, meta: { total, take, skip } });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, slug, email, phone, address, currency, timezone, plan, isActive,
      ownerName, ownerEmail, ownerPassword,
    } = body;

    if (!name || !slug || !email) {
      return NextResponse.json({ error: 'name, slug and email are required' }, { status: 400 });
    }

    if (!ownerName || !ownerEmail || !ownerPassword) {
      return NextResponse.json({ error: 'ownerName, ownerEmail and ownerPassword are required' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    // Atomic: merchant + owner user created together or not at all
    const { merchant, owner } = await prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: { name, slug, email, phone, address, currency, timezone, plan, isActive: Boolean(isActive) },
      });

      const owner = await tx.user.create({
        data: {
          merchantId: merchant.id,
          name: ownerName,
          email: ownerEmail,
          password: hashedPassword,
          role: 'MANAGER', // Default to MANAGER since OWNER is reserved for platform-level admins
        },
        select: { id: true, name: true, email: true, role: true },
      });

      return { merchant, owner };
    });

    return NextResponse.json({ merchant, owner }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      const target = error.meta?.target ?? [];
      const field = target.includes('slug') ? 'slug'
        : target.includes('email') ? 'email'
          : 'field';
      return NextResponse.json(
        { error: `A merchant with this ${field} already exists` },
        { status: 409 }
      );
    }
    console.error('POST /api/merchants', error);
    return NextResponse.json({ error: 'Failed to create merchant' }, { status: 500 });
  }
}