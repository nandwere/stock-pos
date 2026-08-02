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

const EDITABLE_FIELDS = [
    'name',
    'slug',
    'email',
    'phone',
    'address',
    'currency',
    'timezone',
    'plan',
    'isActive',
    'deliveryFee',
    'storefrontEnabled',
    'storefrontTagline',
] as const;

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
    console.log('[merchant update]', { id, body });

    const data: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
        if (field in body) data[field] = body[field];
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
        console.error('[merchant update]', err);
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
