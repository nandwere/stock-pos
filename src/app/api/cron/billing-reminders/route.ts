import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isCronAuthorized } from '@/lib/cron-auth';
import { billingState } from '@/lib/billing-shared';
import { platformDetails } from '@/lib/billing.server';
import { sendBillingReminderEmail } from '@/lib/email';

type Stage = 'T-7' | 'T-3' | 'T-1' | 'T0' | 'LAPSED';

function stageFor(state: ReturnType<typeof billingState>): Stage | null {
  if (state.state === 'lapsed') return 'LAPSED';
  if (state.state === 'grace') return 'T0';
  if (state.state === 'expiring') {
    const d = state.daysLeft ?? 99;
    return d <= 1 ? 'T-1' : d <= 3 ? 'T-3' : 'T-7';
  }
  return null;
}

// Called once a day. Emails each merchant once per stage (7, 3, 1 days before, expiry, and when it lapses).
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const merchants = await prisma.merchant.findMany({
    where: { isActive: true, verifiedAt: { not: null }, planExpiresAt: { not: null } },
    select: { id: true, name: true, email: true, plan: true, planExpiresAt: true, planIsTrial: true, billingNotice: true, planConfig: { select: { name: true } } },
  });

  const { appUrl } = platformDetails();
  let sent = 0, failed = 0;

  for (const m of merchants) {
    const st = billingState(m.planExpiresAt, m.planIsTrial);
    const stage = stageFor(st);
    if (!stage) continue;

    const key = `${m.planExpiresAt!.toISOString().slice(0, 10)}:${stage}`;
    if (m.billingNotice === key) continue; // this stage was already emailed

    try {
      await sendBillingReminderEmail(m.email, {
        businessName: m.name, planName: m.planConfig.name, stage,
        expiresAt: m.planExpiresAt!, graceEndsAt: new Date(st.graceEndsAt!), isTrial: m.planIsTrial,
        billingUrl: `${appUrl}/billing`,
      });
      await prisma.merchant.update({ where: { id: m.id }, data: { billingNotice: key } });
      sent++;
    } catch (err) {
      console.error('[billing-reminders]', m.id, err);
      failed++;
    }
  }

  return NextResponse.json({ checked: merchants.length, sent, failed });
}
