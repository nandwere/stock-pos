// app/api/merchant/settings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Returns all settings as a flat { key: value } object
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.settings.findMany({
    where: { merchantId: session.merchantId },
    select: { key: true, value: true },
  });

  // Shape: { tax_rate: "16", receipt_footer: "Thank you!", ... }
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));

  return NextResponse.json(settings);
}

// Accepts a partial { key: value } object and upserts each entry
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'OWNER' && session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body: Record<string, string> = await request.json();

    // Upsert all keys in parallel
    await Promise.all(
      Object.entries(body).map(([key, value]) =>
        prisma.settings.upsert({
          where: { merchantId_key: { merchantId: session.merchantId, key } },
          update: { value },
          create: { merchantId: session.merchantId, key, value },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

