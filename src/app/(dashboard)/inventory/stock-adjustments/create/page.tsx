// app/inventory/stock-adjustments/create/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast-provider';
import { CreateAdjustmentDTO, Product } from '@/types';
import { AdjustmentForm } from '@/components/inventory/stock-adjustments/AdjustmentForm';

export default function CreateAdjustmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/inventory?active=true');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: CreateAdjustmentDTO) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create adjustment');
      }

      toast({
        title: 'Success',
        description: 'Stock adjustment created successfully',
        variant: 'default',
      });

      router.push('/inventory/stock-adjustments');
      router.refresh();
      
    } catch (error) {
      console.error('Error creating adjustment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create adjustment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory/stock-adjustments"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Adjustment</h1>
            <p className="text-gray-600 mt-1">Adjust product stock levels</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <AdjustmentForm
        products={products}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}