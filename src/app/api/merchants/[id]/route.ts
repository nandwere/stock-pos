// app/api/merchants/[id]/route.ts
//
// NOTE: If you already have this file (e.g. because useToggleMerchant needs
// somewhere to PATCH `isActive`), merge this in rather than overwriting —
// this version just extends the PATCH handler to accept every editable
// field, not only isActive. Same for auth: apply whatever guard your other
// /api/merchants routes already use (this is presumably a platform-level,
// not merchant-level, permission — a different check than the per-merchant
// staff auth in the storefront add-on).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STRING_FIELDS = ['name', 'slug', 'email', 'phone', 'address', 'currency', 'timezone', 'storefrontTagline'] as const;
const NULLABLE_STRING_FIELDS = [
  'storefrontPhone', 'storefrontWhatsapp', 'storefrontEmail', 'storefrontAddress', 'storefrontHours',
] as const;
const BOOLEAN_FIELDS = ['isActive', 'storefrontEnabled'] as const;
const DECIMAL_FIELDS = ['deliveryFee'] as const;
const COORD_FIELDS = ['storefrontLat', 'storefrontLng'] as const;
const ENUM_FIELDS = ['plan'] as const;

const EDITABLE_FIELDS = [
  ...STRING_FIELDS, ...NULLABLE_STRING_FIELDS, ...BOOLEAN_FIELDS,
  ...DECIMAL_FIELDS, ...COORD_FIELDS, ...ENUM_FIELDS,
] as const;

const PHONE_RE = /^\+?[0-9\s-]{9,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9-]+$/;
const MAX_LEN: Record<string, number> = {
  storefrontAddress: 200, storefrontHours: 120, storefrontEmail: 120, storefrontTagline: 160,
};

function coerceValue(field: (typeof EDITABLE_FIELDS)[number], raw: unknown): unknown {
  if ((BOOLEAN_FIELDS as readonly string[]).includes(field)) {
    return raw === true || raw === 'true' || raw === 'on';
  }

  if ((DECIMAL_FIELDS as readonly string[]).includes(field)) {
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (Number.isNaN(num) || num < 0) throw new Error(`${field} must be a non-negative number`);
    return num;
  }

  if ((COORD_FIELDS as readonly string[]).includes(field)) {
    if (raw === null || raw === '') return null;
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
    const limit = field === 'storefrontLat' ? 90 : 180;
    if (Number.isNaN(num) || Math.abs(num) > limit) throw new Error(`${field} is out of range`);
    return Number(num.toFixed(6));          // column is Decimal(9,6)
  }

  if ((NULLABLE_STRING_FIELDS as readonly string[]).includes(field)) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw !== 'string') throw new Error(`${field} must be text`);
    const v = raw.trim();
    if (v === '') return null;               // clearing a field removes it from the storefront
    if (v.length > (MAX_LEN[field] ?? 200)) throw new Error(`${field} is too long`);
    if ((field === 'storefrontPhone' || field === 'storefrontWhatsapp') && !PHONE_RE.test(v)) {
      throw new Error(`${field} is not a valid phone number`);
    }
    if (field === 'storefrontEmail' && !EMAIL_RE.test(v)) throw new Error('storefrontEmail is not a valid email');
    return v;
  }

  // Required strings and the plan enum
  if (typeof raw !== 'string') throw new Error(`${field} must be text`);
  const v = raw.trim();
  if (['name', 'slug', 'email'].includes(field) && v === '') throw new Error(`${field} is required`);
  if (field === 'slug' && !SLUG_RE.test(v)) throw new Error('slug may only contain lowercase letters, numbers and hyphens');
  if (field === 'email' && !EMAIL_RE.test(v)) throw new Error('email is not valid');
  return v;                                   // Prisma validates the plan enum itself
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, products: true, sales: true } },
    },
  });

  if (!merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
  }

  return NextResponse.json(merchant);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  try {
    for (const field of EDITABLE_FIELDS) {
      if (field in body) data[field] = coerceValue(field, body[field]);
    }
    // Lat/lng must be set together or cleared together
    const hasLat = 'storefrontLat' in data;
    const hasLng = 'storefrontLng' in data;
    if (hasLat !== hasLng || (hasLat && (data.storefrontLat === null) !== (data.storefrontLng === null))) {
      return NextResponse.json({ error: 'Latitude and longitude must be provided together' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
  }

  // Slug and email both have unique constraints — surface a clear error
  // instead of a generic 500 if the edit collides with another merchant.
  try {
    const merchant = await prisma.merchant.update({
      where: { id },
      data,
      include: { _count: { select: { users: true, products: true, sales: true } } },
    });
    return NextResponse.json(merchant);
  } catch (err: any) {
    if (err.code === 'P2002') {
      const target = err.meta?.target?.join?.(', ') ?? 'a field';
      return NextResponse.json({ error: `${target} is already in use by another merchant` }, { status: 409 });
    }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }
    console.error('[merchant update]', err);
    return NextResponse.json({ error: 'Could not update merchant' }, { status: 500 });
  }
}
