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
const BOOLEAN_FIELDS = ['isActive', 'storefrontEnabled'] as const;
const DECIMAL_FIELDS = ['deliveryFee'] as const;
const ENUM_FIELDS = ['plan'] as const;

const EDITABLE_FIELDS = [...STRING_FIELDS, ...BOOLEAN_FIELDS, ...DECIMAL_FIELDS, ...ENUM_FIELDS] as const;

/**
 * Request bodies are never pre-typed, regardless of what the frontend
 * intends to send — a native HTML checkbox posts "on"/undefined, not
 * true/false; a number input posts a string; JSON.stringify(true) is fine
 * but JSON.stringify of a FormData-derived object often isn't. Coerce
 * explicitly per field rather than trusting whatever shape arrived.
 */
function coerceValue(field: (typeof EDITABLE_FIELDS)[number], raw: unknown): unknown {
  if ((BOOLEAN_FIELDS as readonly string[]).includes(field)) {
    // Handles real booleans (true/false), the string forms of them, and
    // the native-checkbox "on" value. Anything else (including "off",
    // "", null, undefined) is false — checkboxes don't POST at all when
    // unchecked, so absence must mean false, not "leave unchanged" (the
    // caller only includes fields it actually means to set, per the
    // `field in body` check below).
    return raw === true || raw === 'true' || raw === 'on';
  }

  if ((DECIMAL_FIELDS as readonly string[]).includes(field)) {
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (Number.isNaN(num)) throw new Error(`${field} must be a number`);
    return num;
  }

  // Strings and the plan enum pass through as-is — Prisma validates the
  // enum value itself and rejects anything not in MerchantPlan.
  return raw;
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
  }

  // Slug and email both have unique constraints — surface a clear error
  // instead of a generic 500 if the edit collides with another merchant.
  try {
    const merchant = await prisma.merchant.update({ where: { id }, data });
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
