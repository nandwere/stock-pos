// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasPermission, getCurrentUser, getSession, getActor } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { isLastAdmin, outranks } from '@/lib/permissions.server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id, merchantId },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    console.error('GET /api/users/[id]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {

  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!actor.can('users.edit')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const target = await prisma.user.findFirst({
      where: actor.isSuperAdmin ? { id } : { id, merchantId: actor.merchantId },
      include: { role: true },
    });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.id !== actor.userId && (!target.role || !outranks(actor, target.role))) {
      return NextResponse.json({ error: 'You cannot modify a user with that role' }, { status: 403 });
    }

    const body = await request.json();
    const data: any = {};
    if (body.name) data.name = body.name;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
    if (body.password) data.password = await bcrypt.hash(body.password, 10);
    if (body.merchantId !== undefined) { /* keep the platform-admin merchant move logic from before */ }

    if (body.password) {
      data.passwordChangedAt = new Date();
      data.mustChangePassword = body.forceChange === true;
    }
    if (body.forceChange === true && !body.password) data.mustChangePassword = true;

    let newRole: { level: number; isAdmin: boolean } | null = null;
    if (body.roleId && body.roleId !== target.roleId) {
      if (target.id === actor.userId) {
        return NextResponse.json({ error: "You can't change your own role" }, { status: 400 });
      }
      const found = await prisma.role.findFirst({ where: { id: body.roleId, merchantId: target.merchantId } });
      if (!found) return NextResponse.json({ error: 'Role not found for this merchant' }, { status: 400 });
      if (!outranks(actor, found)) return NextResponse.json({ error: 'You cannot assign that role' }, { status: 403 });
      data.roleId = found.id;
      newRole = found;
    }

    const demoting = newRole && !newRole.isAdmin;
    if ((demoting || body.isActive === false) && (await isLastAdmin({ id: target.id, isSuperAdmin: target.isSuperAdmin || target.role?.isAdmin || false }))) {
      return NextResponse.json({ error: 'A merchant must keep at least one active Admin' }, { status: 409 });
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data,
      select: {
        id: true, name: true, email: true, isActive: true, createdAt: true,
        role: { select: { id: true, name: true, level: true, isAdmin: true } },
        merchant: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/users/[id]', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await hasPermission('users.delete'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { id } = await params;

    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const target = await prisma.user.findFirst({
      where: actor.isSuperAdmin ? { id } : { id, merchantId: actor.merchantId },
      include: { role: true },
    });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.id !== actor.userId && (!target.role || !outranks(actor, target.role))) {
      return NextResponse.json({ error: 'You cannot modify a user with that role' }, { status: 403 });
    }

    if (await isLastAdmin({ id: target.id, isSuperAdmin: target.isSuperAdmin || target.role?.isAdmin || false })) {
      return NextResponse.json({ error: 'A merchant must keep at least one Admin' }, { status: 409 });
    }

    // Prevent deleting yourself
    const current = await getCurrentUser();
    if (current?.id === id) {
      return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id, merchantId: actor.merchantId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/users/[id]', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}