import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getActor } from '@/lib/auth';

// GET /api/admin/support-requests?status=OPEN|RESOLVED|all — super admin only
export async function GET(request: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!actor.can('merchants.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const status = new URL(request.url).searchParams.get('status');
  const where: Prisma.SupportRequestWhereInput = status === 'OPEN' || status === 'RESOLVED' ? { status } : {};
  const rows = await prisma.supportRequest.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 });

  // Resolve merchant names for requests sent while signed in
  const ids = [...new Set(rows.map((r) => r.merchantId).filter((x): x is string => !!x))];
  const merchants = ids.length ? await prisma.merchant.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true } }) : [];
  const byId = new Map(merchants.map((m) => [m.id, m]));

  return NextResponse.json({
    data: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), resolvedAt: r.resolvedAt?.toISOString() ?? null, merchant: r.merchantId ? byId.get(r.merchantId) ?? null : null })),
  });
}
