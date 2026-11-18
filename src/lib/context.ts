import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, getSession } from '@/lib/auth';
import { addDays, daysBetween, isYmd, todayIn } from './dates';
import type { Group } from './types';
import { guardFeature } from '@/lib/plan-guard';

export type ReportCtx = {
  merchantId: string;
  merchantName: string;
  currency: string;
  tz: string;
  from: string; // YYYY-MM-DD, merchant-local
  to: string;   // YYYY-MM-DD, merchant-local, inclusive
  group: Group;
};

const fail = (error: string, status: number) => ({ error: NextResponse.json({ error }, { status }) });

export async function getReportContext(
  request: NextRequest
): Promise<{ ctx: ReportCtx } | { error: NextResponse }> {
  const session = await getSession();
  const user = await getCurrentUser();
  if (!session || !user) return fail('Unauthorized', 401);
  const blocked = await guardFeature(session, 'reports');
  if (blocked) return { error: blocked };

  const merchant = await prisma.merchant.findUnique({
    where: { id: session.merchantId },
    select: { name: true, currency: true, timezone: true },
  });
  if (!merchant) return fail('Merchant not found', 404);

  const sp = new URL(request.url).searchParams;
  const tz = merchant.timezone;
  const to = sp.get('to') ?? todayIn(tz);
  const from = sp.get('from') ?? addDays(to, -29);

  if (!isYmd(from) || !isYmd(to)) return fail('from/to must be YYYY-MM-DD', 400);
  if (from > to) return fail('from must be on or before to', 400);
  if (daysBetween(from, to) > 366) return fail('Range cannot exceed 366 days', 400);

  const g = sp.get('group');
  const group: Group = g === 'week' || g === 'month' ? g : 'day';

  return {
    ctx: { merchantId: session.merchantId, merchantName: merchant.name, currency: merchant.currency, tz, from, to, group },
  };
}