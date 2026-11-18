import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActor, getSession } from '@/lib/auth';
import { getPlans, invalidatePlans, toPlanConfig } from '@/lib/plans.server';
import { firstIssue, planCreateSchema } from '@/lib/plan-schema';

// GET /api/plans              → plans merchants can buy (active + public). Any signed-in user.
// GET /api/plans?scope=admin  → every plan with merchant counts. Super admin only.
export async function GET(request: NextRequest) {
  const scope = new URL(request.url).searchParams.get('scope');

  if (scope === 'admin') {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!actor.can('plans.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const rows = await prisma.plan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { merchants: true } } },
    });
    return NextResponse.json({
      data: rows.map(r => ({ ...toPlanConfig(r), merchantCount: r._count.merchants })),
    });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plans = (await getPlans()).filter(p => p.isActive && p.isPublic);
  return NextResponse.json({ data: plans });
}

export async function POST(request: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!actor.can('plans.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = planCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const input = parsed.data;

  if (input.isDefault && !input.isActive) {
    return NextResponse.json({ error: 'The default plan must be active' }, { status: 400 });
  }

  try {
    const plan = await prisma.$transaction(async tx => {
      if (input.isDefault) await tx.plan.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      if (input.isPopular) await tx.plan.updateMany({ where: { isPopular: true }, data: { isPopular: false } });
      return tx.plan.create({ data: input });
    });
    invalidatePlans();
    return NextResponse.json(toPlanConfig(plan), { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') return NextResponse.json({ error: `A plan with key ${input.key} already exists` }, { status: 409 });
    console.error('POST /api/plans', err);
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}
