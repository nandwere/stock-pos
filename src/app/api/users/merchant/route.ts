import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasPermission, getCurrentUser, getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { merchantId } = session;

    // require view permission

    if (!(await hasPermission('users.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim();
    const role = url.searchParams.get('role');
    const isActiveParam = url.searchParams.get('isActive');
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 20);
    const skip = (page - 1) * pageSize;

    const where: any = { merchantId };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (isActiveParam !== null) where.isActive = isActiveParam === 'true';

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ data, meta: { total, page, pageSize } });
  } catch (error) {
    console.error('GET /api/users', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}