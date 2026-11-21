import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActor } from '@/lib/auth';

// PATCH { status: 'OPEN' | 'RESOLVED' }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!actor.can('merchants.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { status } = (await request.json().catch(() => ({}))) as { status?: string };
  if (status !== 'OPEN' && status !== 'RESOLVED') return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const { id } = await params;
  try {
    const row = await prisma.supportRequest.update({ where: { id }, data: { status, resolvedAt: status === 'RESOLVED' ? new Date() : null } });
    return NextResponse.json({ id: row.id, status: row.status });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    throw err;
  }
}
