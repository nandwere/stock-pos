import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActor } from '@/lib/auth';
import { invalidatePlans, toPlanConfig } from '@/lib/plans.server';
import { firstIssue, planUpdateSchema } from '@/lib/plan-schema';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!actor.can('plans.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const parsed = planUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const input = parsed.data;
  if (Object.keys(input).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  // New merchants are given the default plan, so there must always be one, and it must be assignable.
  if (existing.isDefault && input.isDefault === false) {
    return NextResponse.json({ error: 'Make another plan the default instead of unsetting this one' }, { status: 400 });
  }
  if ((input.isDefault ?? existing.isDefault) && input.isActive === false) {
    return NextResponse.json({ error: 'The default plan must stay active' }, { status: 400 });
  }

  try {
    const plan = await prisma.$transaction(async tx => {
      if (input.isDefault) await tx.plan.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
      if (input.isPopular) await tx.plan.updateMany({ where: { isPopular: true, id: { not: id } }, data: { isPopular: false } });
      return tx.plan.update({ where: { id }, data: input });
    });
    invalidatePlans();
    return NextResponse.json(toPlanConfig(plan));
  } catch (err: any) {
    console.error('PATCH /api/plans/[id]', err);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!actor.can('plans.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const plan = await prisma.plan.findUnique({
    where: { id },
    include: { _count: { select: { merchants: true, paymentRequests: true } } },
  });
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  if (plan.isDefault) {
    return NextResponse.json({ error: 'Make another plan the default before deleting this one' }, { status: 409 });
  }
  if (plan._count.merchants > 0 || plan._count.paymentRequests > 0) {
    return NextResponse.json(
      { error: `This plan is used by ${plan._count.merchants} merchant(s) and ${plan._count.paymentRequests} payment request(s). Deactivate it instead.` },
      { status: 409 }
    );
  }

  await prisma.plan.delete({ where: { id } });
  invalidatePlans();
  return NextResponse.json({ success: true });
}
