// app/inventory/stock-adjustments/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Download, Filter, RefreshCw, Minus, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';
import { AdjustmentTable } from '@/components/inventory/stock-adjustments/AdjustmentTable';
import { Product, StockAdjustment, TransactionType } from '@/types';

export default function StockAdjustmentsPage() {
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    productId: '',
    type: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchAdjustments();
    fetchProducts();
  }, [filters]);

  const fetchAdjustments = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      if (filters.productId) params.append('productId', filters.productId);
      if (filters.type) params.append('type', filters.type);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await fetch(`/api/inventory/adjustments?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch adjustments');
      }
      
      const result = await response.json();
      setAdjustments(result.data || []);
    } catch (error) {
      console.error('Error fetching adjustments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load adjustments',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/inventory?limit=100');
      if (response.ok) {
        const result = await response.json();
        setProducts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/inventory/adjustments/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-adjustments-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: 'Error',
        description: 'Failed to export adjustments',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Adjustments</h1>
          <p className="text-gray-600 mt-1">Manage inventory adjustments and corrections</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
          <Link
            href="/inventory/stock-adjustments/create"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Adjustment
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Total Additions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {adjustments
              .filter(a => a.type === TransactionType.ADJUSTMENT_ADD)
              .reduce((sum, a) => Number(sum) + Number(a.quantity), 0)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <Minus className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm text-gray-600">Total Removals</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {adjustments
              .filter(a => a.type === 'ADJUSTMENT_REMOVE')
              .reduce((sum, a) => sum + a.quantity, 0)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm text-gray-600">Damaged Goods</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {adjustments
              .filter(a => a.type === 'DAMAGE')
              .reduce((sum, a) => sum + a.quantity, 0)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">Total Adjustments</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{adjustments.length}</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading adjustments...</p>
        </div>
      ) : (
        <AdjustmentTable
          adjustments={adjustments}
          products={products}
          onFilterChange={handleFilterChange}
        />
      )}
    </div>
  );
}