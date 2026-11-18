import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createDefaultRoles } from '@/lib/permissions.server';
import { getActor } from '@/lib/auth';
import { getDefaultPlan, getPlan, invalidatePlans } from '@/lib/plans.server';

export async function GET(request: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!actor.can('merchants.manage')) {
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
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!actor.can('merchants.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, slug, email, phone, address, currency, timezone, plan, isActive,
      ownerName, ownerEmail, ownerPassword } = body;

    if (!name || !slug || !email) {
      return NextResponse.json({ error: 'name, slug and email are required' }, { status: 400 });
    }

    if (!ownerName || !ownerEmail || !ownerPassword) {
      return NextResponse.json({ error: 'ownerName, ownerEmail and ownerPassword are required' }, { status: 400 });
    }

    const planKey: string = plan || (await getDefaultPlan()).key;
    const planRow = await getPlan(planKey);
    if (!planRow || !planRow.isActive) {
      return NextResponse.json({ error: 'That plan does not exist or is not active' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    const { merchant, owner } = await prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: { name, slug, email, phone, address, currency, timezone, plan: planKey, isActive: isActive ?? true },
      });
      // Roles first, so the first user can be given the Admin role
      const roleIds = await createDefaultRoles(tx, merchant.id);
      const owner = await tx.user.create({
        data: {
          merchantId: merchant.id,
          name: ownerName,
          email: ownerEmail,
          password: hashedPassword,
          roleId: roleIds.admin,   // merchant's locked, full-access role
        },
        select: {
          id: true, name: true, email: true,
          role: { select: { id: true, name: true } },
        },
      });

      return { merchant, owner };
    }, { timeout: 15_000 });       // default is 5s, and creating roles and grants is several inserts
    return NextResponse.json({ merchant, owner }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      const target: string[] = error.meta?.target ?? [];
      const msg = target.includes('slug') ? 'A merchant with this slug already exists'
        : target.some(t => t.includes('email')) ? 'That email is already in use (merchant or owner)'
          : 'Duplicate value';
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error('POST /api/merchants', error);
    return NextResponse.json({ error: 'Failed to create merchant' }, { status: 500 });
  }
}