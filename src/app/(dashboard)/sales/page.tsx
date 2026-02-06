// src/app/(dashboard)/sales/page.tsx
import { SalesList } from '@/components/sales/SalesList';

type SearchParams = { q?: string };

export default async function SalesPage({ searchParams }: { searchParams?: SearchParams }) {
  // const q = await searchParams?.q?.trim();
  // const query = new URLSearchParams();
  // if (q) query.set('q', q);

  return (
    <div className="p-6">
      <SalesList />
    </div>
  );

}