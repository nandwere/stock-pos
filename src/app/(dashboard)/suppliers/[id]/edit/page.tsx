'use client';
import { useSupplier } from '@/lib/hooks/use-suppliers';
import { SupplierForm } from '@/components/suppliers/supplier-form';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditSupplierPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useSupplier(params.id);
  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;
  return <SupplierForm supplier={data} />;
}