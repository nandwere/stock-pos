// app/store/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { StorefrontClient } from './StorefrontClient';

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  console.log('Storefront slug:', slug); // Log the slug to verify it's being received correctly

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
    notFound();
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { merchantId: merchant.id, isActive: true, currentStock: { gt: 0 }, showOnStorefront: true },
      select: {
        id: true,
        name: true,
        description: true,
        sellingPrice: true,
        currentStock: true,
        unit: true,
        categoryId: true,
        showOnStorefront: true,
        imageUrl: true,
        imagePublicId: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({
      where: { merchantId: merchant.id},
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);


  // console.log('Fetched products:', products); // Log the fetched products
  // console.log('Fetched categories:', categories); // Log the fetched categories

  return (
    <StorefrontClient
      slug={slug}
      store={{
        name: merchant.name,
        logoUrl: merchant.logoUrl,
        currency: merchant.currency,
        tagline: merchant.storefrontTagline,
        deliveryFee: Number(merchant.deliveryFee),
      }}
      categories={categories}
      products={products.map((p: any) => ({
        ...p,
        sellingPrice: Number(p.sellingPrice),
        currentStock: Number(p.currentStock),
      }))}
    />
  );
}
