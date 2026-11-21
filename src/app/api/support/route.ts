import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { validateSupport } from '@/lib/support';
import { nextNumber, platformDetails } from '@/lib/billing.server';
import { sendSupportAckEmail, sendSupportRequestEmail } from '@/lib/email';

// POST /api/support — public. Saved first (so nothing is lost if email is down), then emailed.
export async function POST(request: NextRequest) {
  if (!rateLimit(`support:${clientIp(request)}`, 5, 3_600_000)) {
    return NextResponse.json({ error: 'You have sent several messages already. Please try again later.' }, { status: 429 });
  }
  const b = await request.json().catch(() => null);
  if (!b) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  // Honeypot: real people never fill this in. Pretend it worked.
  if (typeof b.website === 'string' && b.website.trim()) return NextResponse.json({ ok: true, ref: 'SUP-RECEIVED' });

  const input = {
    name: String(b.name ?? '').trim(),
    email: String(b.email ?? '').trim().toLowerCase(),
    businessCode: String(b.businessCode ?? '').trim().toLowerCase(),
    topic: String(b.topic ?? ''),
    message: String(b.message ?? '').trim(),
  };
  const problem = validateSupport(input);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  // Which merchant this is from, if they are signed in: taken from the session, never from the form
  const session = await getSession().catch(() => null);

  const created = await prisma.$transaction(async (tx) => {
    const ref = await nextNumber(tx, 'SUP');
    return tx.supportRequest.create({
      data: { ref, name: input.name, email: input.email, businessCode: input.businessCode || null, topic: input.topic, message: input.message, merchantId: session?.merchantId ?? null },
    });
  });

  // Best effort from here: the request is already stored and visible to the super admin
  const inbox = process.env.SUPPORT_EMAIL || platformDetails().email;
  if (inbox) {
    sendSupportRequestEmail(inbox, { ...input, ref: created.ref, signedIn: !!session })
      .catch((e) => console.error('[support] inbox email failed', e));
  }
  sendSupportAckEmail(input.email, { ref: created.ref, name: input.name, topic: input.topic })
    .catch((e) => console.error('[support] acknowledgement email failed', e));

  return NextResponse.json({ ok: true, ref: created.ref }, { status: 201 });
}
