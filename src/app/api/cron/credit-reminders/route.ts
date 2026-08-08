// app/api/cron/credit-reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentMethod } from '@prisma/client';

// Called by an external scheduler (Vercel Cron, GitHub Actions cron, etc.)
// — not by any user action — so it's gated by a shared secret rather than
// a user session.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999); // include everything due today, not just already-overdue

  const dueSales = await prisma.sale.findMany({
    where: {
      paymentMethod: PaymentMethod.CREDIT,
      dueDate: { lte: today },
      reminderSentAt: null,
      // amountPaid < total means still owing — skip sales that got settled early
      total: { gt: prisma.sale.fields.amountPaid }, // if your Prisma version doesn't support field comparison, filter this in JS instead
    },
  });

  const results = { sent: 0, failed: 0 };

  for (const sale of dueSales) {
    const balance = Number(sale.total) - Number(sale.amountPaid);
    try {
      await sendSms({
        to: sale.customerPhone!,
        message: `Hi ${sale.customerName}, a reminder that your balance of ${balance.toFixed(2)} for sale #${sale.saleNumber} is due. Please settle at your earliest convenience.`,
      });
      await prisma.sale.update({
        where: { id: sale.id },
        data: { reminderSentAt: new Date() },
      });
      results.sent++;
    } catch (err) {
      console.error(`Failed to send reminder for sale ${sale.id}:`, err);
      results.failed++;
      // no reminderSentAt update — it'll retry next run
    }
  }

  return NextResponse.json(results);
}

async function sendSms({ to, message }: { to: string; message: string }) {
  // Africa's Talking example — swap for Twilio etc. as needed
  const res = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      apiKey: process.env.AFRICASTALKING_API_KEY!,
    },
    body: new URLSearchParams({
      username: process.env.AFRICASTALKING_USERNAME!,
      to,
      message,
    }),
  });
  if (!res.ok) throw new Error(`SMS send failed: ${res.status}`);
}