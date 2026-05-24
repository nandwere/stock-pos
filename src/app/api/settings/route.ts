import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Keys stored in the Settings table (everything else is on the Merchant row)
const SETTING_KEYS = [
  'tax_rate', 'tax_name', 'receipt_footer',
  'auto_generate_receipt', 'require_customer_name', 'allow_negative_stock',
  'low_stock_threshold', 'email_notifications', 'sms_notifications',
  'daily_report_email', 'require_password_change', 'session_timeout',
  'two_factor_auth', 'auto_backup', 'backup_frequency', 'price_includes_tax',
];

// ── GET /api/settings ─────────────────────────────────────────────────────────
// Returns a flat object: merchant fields + settings key-value pairs merged together

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  console.log('GET /api/settings for merchantId:', session.merchantId);

  const [merchant, settings] = await Promise.all([
    prisma.merchant.findUnique({
      where: { id: session.merchantId },
      select: { name: true, phone: true, email: true, address: true, logoUrl: true, currency: true, timezone: true },
    }),
    prisma.settings.findMany({
      where: { merchantId: session.merchantId },
      select: { key: true, value: true },
    }),
  ]);

  if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

  // Flatten settings array into object
  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

  return NextResponse.json({ ...merchant, ...settingsMap });
}

// ── PUT /api/settings ─────────────────────────────────────────────────────────
// Splits the payload: merchant fields → Merchant table, the rest → Settings table

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only OWNERs and MANAGERs can change settings
  if (!['OWNER', 'MANAGER'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  // Split payload into merchant fields vs settings keys
  const merchantUpdate: Record<string, string> = {};
  const settingsUpserts: { key: string; value: string }[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (['name', 'phone', 'email', 'address', 'logoUrl', 'currency', 'timezone'].includes(key)) {
      merchantUpdate[key] = value as string;
    } else if (SETTING_KEYS.includes(key)) {
      settingsUpserts.push({ key, value: value as string });
    }
    // Ignore unknown keys silently
  }

  try {
    await prisma.$transaction([
      // 1. Update merchant row
      prisma.merchant.update({
        where: { id: session.merchantId },
        data: merchantUpdate,
      }),

      // 2. Upsert each setting key
      ...settingsUpserts.map(({ key, value }) =>
        prisma.settings.upsert({
          where: { merchantId_key: { merchantId: session.merchantId, key } },
          update: { value },
          create: { merchantId: session.merchantId, key, value },
        })
      ),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /api/settings', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}