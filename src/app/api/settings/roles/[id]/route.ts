// src/app/api/settings/roles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActor } from '@/lib/auth';
import { getCatalog, outranks } from '@/lib/permissions.server';

async function guard(id: string) {
  const actor = await getActor();
  if (!actor) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!actor.can('roles.manage')) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  const role = await prisma.role.findFirst({
    where: { id, merchantId: actor.merchantId },
    include: { grants: { select: { permission: true } }, _count: { select: { users: true } } },
  });
  if (!role) return { error: NextResponse.json({ error: 'Role not found' }, { status: 404 }) };
  if (role.isAdmin) return { error: NextResponse.json({ error: 'The Admin role is locked' }, { status: 403 }) };
  if (!outranks(actor, role)) return { error: NextResponse.json({ error: 'You cannot modify a role at or above your own' }, { status: 403 }) };
  return { actor, role };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, role, error } = await guard(id);
  if (error) return error;

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.name?.trim()) data.name = body.name.trim();            // key never changes
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.level !== undefined) {
    const lvl = Number(body.level);
    const maxLevel = actor!.isSuperAdmin || actor!.role.isAdmin ? 99 : actor!.role.level - 1;
    if (!Number.isInteger(lvl) || lvl < 1 || lvl > maxLevel) {
      return NextResponse.json({ error: `Level must be between 1 and ${maxLevel}` }, { status: 400 });
    }
    data.level = lvl;
  }

  const ops: any[] = [prisma.role.update({ where: { id }, data })];

  if (Array.isArray(body.permissions)) {
    const catalog = (await getCatalog()).flatMap(g => g.permissions);
    const valid = new Set(catalog.filter(p => !p.adminOnly).map(p => p.key));
    const wanted = new Set<string>(body.permissions.filter((k: string) => valid.has(k)));

    // Only touch permissions the actor holds. Anything else on the role is preserved.
    const mine = actor!.permissions;
    const keep = role!.grants.map(g => g.permission).filter(k => !mine.has(k));
    const next = new Set([...keep, ...[...wanted].filter(k => mine.has(k))]);

    ops.push(prisma.roleGrant.deleteMany({ where: { roleId: id } }));
    ops.push(prisma.roleGrant.createMany({ data: [...next].map(permission => ({ roleId: id, permission })) }));
  }

  await prisma.$transaction(ops);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role, error } = await guard(id);
  if (error) return error;

  if (role!.isSystem) return NextResponse.json({ error: 'Built-in roles cannot be deleted' }, { status: 400 });
  if (role!._count.users > 0) {
    return NextResponse.json({ error: `Reassign the ${role!._count.users} user(s) with this role first` }, { status: 409 });
  }
  await prisma.role.delete({ where: { id } });
  return NextResponse.json({ success: true });
}