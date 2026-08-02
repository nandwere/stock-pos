// app/api/storefront/[slug]/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const merchant = await prisma.merchant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      currency: true,
      storefrontEnabled: true,
      storefrontTagline: true,
      deliveryFee: true,
      isActive: true,
    },
  });

  if (!merchant || !merchant.isActive || !merchant.storefrontEnabled) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') ?? undefined;
  const categoryId = searchParams.get('categoryId') ?? undefined;

  const products = await prisma.product.findMany({
    where: {
      merchantId: merchant.id,
      isActive: true,
      currentStock: { gt: 0 },
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? { name: { contains: search, mode: 'insensitive' } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      sellingPrice: true,
      currentStock: true,
      unit: true,
      categoryId: true,
      category: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  const categories = await prisma.category.findMany({
    where: { merchantId: merchant.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    store: {
      name: merchant.name,
      logoUrl: merchant.logoUrl,
      currency: merchant.currency,
      tagline: merchant.storefrontTagline,
      deliveryFee: merchant.deliveryFee,
    },
    categories,
    products,
  });
}
