// src/app/api/roles/assignable/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActor } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!actor.can('users.create') && !actor.can('users.edit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const requested = new URL(request.url).searchParams.get('merchantId');
  const merchantId = actor.isSuperAdmin && requested ? requested : actor.merchantId;
  const unrestricted = actor.isSuperAdmin || actor.role.isAdmin;

  const roles = await prisma.role.findMany({
    where: { merchantId, ...(unrestricted ? {} : { level: { lt: actor.role.level } }) },
    orderBy: { level: 'desc' },
    select: { id: true, name: true, level: true, isAdmin: true },
  });
  return NextResponse.json({ data: roles });
}