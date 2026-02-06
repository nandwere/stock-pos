// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasPermission, getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission('users.view'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const id = params.id;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    console.error('GET /api/users/[id]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission('users.edit'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const id = params.id;
    const body = await request.json();
    const data: any = {};

    if (body.name) data.name = body.name;
    if (body.role) data.role = body.role;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
    if (body.password) data.password = await bcrypt.hash(body.password, 10);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/users/[id]', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission('users.delete'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const id = params.id;

    // Prevent deleting yourself
    const current = await getCurrentUser();
    if (current?.id === id) {
      return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/users/[id]', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}