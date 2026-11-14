// src/app/api/settings/roles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActor } from '@/lib/auth';
import { getCatalog, getCatalogForClient, outranks } from '@/lib/permissions.server';

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export async function GET() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!actor.can('roles.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [catalog, roles] = await Promise.all([
    getCatalogForClient(),
    prisma.role.findMany({
      where: { merchantId: actor.merchantId },
      orderBy: { level: 'desc' },
      include: { grants: { select: { permission: true } }, _count: { select: { users: true } } },
    }),
  ]);
  const allKeys = catalog.flatMap(g => g.permissions.map(p => p.key));

  return NextResponse.json({
    catalog,
    grantable: [...actor.permissions],
    maxLevel: actor.isSuperAdmin || actor.role.isAdmin ? 99 : actor.role.level - 1,
    roles: roles.map(r => ({
      id: r.id, key: r.key, name: r.name, description: r.description, level: r.level,
      isAdmin: r.isAdmin, isSystem: r.isSystem, userCount: r._count.users,
      editable: !r.isAdmin && outranks(actor, r),
      permissions: r.isAdmin ? allKeys : r.grants.map(g => g.permission),
    })),
  });
}

export async function POST(request: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!actor.can('roles.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, description, level, permissions } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const lvl = Number(level);
  const maxLevel = actor.isSuperAdmin || actor.role.isAdmin ? 99 : actor.role.level - 1;
  if (!Number.isInteger(lvl) || lvl < 1 || lvl > maxLevel) {
    return NextResponse.json({ error: `Level must be between 1 and ${maxLevel}` }, { status: 400 });
  }

  const catalog = (await getCatalog()).flatMap(g => g.permissions);
  const valid = new Set(catalog.filter(p => !p.adminOnly).map(p => p.key));
  const wanted = (Array.isArray(permissions) ? permissions : []).filter((k: string) => valid.has(k));
  if (wanted.some((k: string) => !actor.permissions.has(k))) {
    return NextResponse.json({ error: "You can't grant permissions you don't have" }, { status: 403 });
  }

  try {
    const role = await prisma.role.create({
      data: {
        merchantId: actor.merchantId, key: slug(name), name: name.trim(),
        description: description?.trim() || null, level: lvl,
        grants: { create: wanted.map((permission: string) => ({ permission })) },
      },
      select: { id: true },
    });
    return NextResponse.json(role, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'A role with that name already exists' }, { status: 409 });
    throw e;
  }
}