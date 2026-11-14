// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasPermission, getSession, getActor } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { outranks } from '@/lib/permissions.server';
import { validatePassword } from '@/lib/password-policy';

export async function GET(request: NextRequest) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!actor.can('users.view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim();
    const role = url.searchParams.get('role');
    const isActiveParam = url.searchParams.get('isActive');
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? 20)));
    const skip = (page - 1) * pageSize;

    const where: any = actor.isSuperAdmin ? {} : { merchantId: actor.merchantId };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (role) where.roleId = role;
    if (isActiveParam !== null) where.isActive = isActiveParam === 'true';

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        // select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, merchantId: true },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip,
        include: {
          role: { select: { id: true, name: true, level: true, isAdmin: true } },
          merchant: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ data, meta: { total, page, pageSize } });
  } catch (error) {
    console.error('GET /api/users', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!actor.can('users.create')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { email, name, roleId, password, isActive } = body;
    const merchantId = actor.isSuperAdmin ? (body.merchantId || actor.merchantId) : actor.merchantId;

    const role = await prisma.role.findFirst({ where: { id: roleId, merchantId } });
    if (!role) return NextResponse.json({ error: 'Role not found for this merchant' }, { status: 400 });
    if (!outranks(actor, role)) return NextResponse.json({ error: 'You cannot assign that role' }, { status: 403 });

    const pwProblem = validatePassword(password);
    if (pwProblem) return NextResponse.json({ error: pwProblem }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, roleId: role.id, password: hashed, merchantId, isActive: isActive ?? true },
      select: {
        id: true, email: true, name: true, isActive: true, createdAt: true,
        role: { select: { id: true, name: true, level: true, isAdmin: true } },
        merchant: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 });
    }
    console.error('POST /api/users', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}