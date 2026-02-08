// app/inventory/stock-adjustments/components/AdjustmentTable.tsx
'use client';

import { useState } from 'react';
import { 
  Plus, 
  Minus, 
  AlertCircle, 
  Package, 
  Search,
  Filter,
  Download,
  Calendar
} from 'lucide-react';
import { StockAdjustment, TransactionType } from '@/types';


interface AdjustmentTableProps {
  adjustments: StockAdjustment[];
  products: Array<{ id: string; name: string; }>;
  onFilterChange: (filters: any) => void;
}

export function AdjustmentTable({ adjustments, products, onFilterChange }: AdjustmentTableProps) {
  const [filters, setFilters] = useState({
    productId: '',
    type: '',
    startDate: '',
    endDate: '',
  });

  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.ADJUSTMENT_ADD:
        return { icon: Plus, color: 'text-green-600 bg-green-50' };
      case TransactionType.ADJUSTMENT_REMOVE:
      case TransactionType.DAMAGE:
      case TransactionType.THEFT:
        return { icon: Minus, color: 'text-red-600 bg-red-50' };
      default:
        return { icon: Package, color: 'text-blue-600 bg-blue-50' };
    }
  };

  const getTypeLabel = (type: TransactionType) => {
    const labels = {
      [TransactionType.ADJUSTMENT_ADD]: 'Add Stock',
      [TransactionType.ADJUSTMENT_REMOVE]: 'Remove Stock',
      [TransactionType.DAMAGE]: 'Damaged',
      [TransactionType.THEFT]: 'Theft/Loss',
      [TransactionType.EXPIRY]: 'Expired',
      [TransactionType.CORRECTION]: 'Correction',
      [TransactionType.RETURN]: 'Return',
      [TransactionType.SAMPLE]: 'Sample',
    };
    return labels[type] || type;
  };

  const handleFilterChange = (field: string, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <select
                value={filters.productId}
                onChange={(e) => handleFilterChange('productId', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Products</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Types</option>
            <option value="ADJUSTMENT_ADD">Add Stock</option>
            <option value="ADJUSTMENT_REMOVE">Remove Stock</option>
            <option value="DAMAGE">Damaged</option>
            <option value="THEFT">Theft/Loss</option>
            <option value="EXPIRY">Expired</option>
            <option value="CORRECTION">Correction</option>
          </select>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                placeholder="From"
              />
            </div>
            
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                placeholder="To"
              />
            </div>
          </div>

          <button
            onClick={() => {
              const resetFilters = { productId: '', type: '', startDate: '', endDate: '' };
              setFilters(resetFilters);
              onFilterChange(resetFilters);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No adjustments found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                adjustments.map((adjustment) => {
                  const { icon: TypeIcon, color } = getTypeIcon(adjustment.type);
                  return (
                    <tr key={adjustment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(String(adjustment.createdAt))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {adjustment?.product?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            SKU: {adjustment?.product?.sku}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${color}`}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium">
                            {getTypeLabel(adjustment.type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-medium ${
                          adjustment.type === TransactionType.ADJUSTMENT_ADD
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {adjustment.type === TransactionType.ADJUSTMENT_ADD ? '+' : '-'}
                          {adjustment.quantity} {adjustment.product.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{adjustment.reason}</div>
                        {adjustment.notes && (
                          <div className="text-xs text-gray-500 mt-1">{adjustment.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{adjustment.user.name}</div>
                        <div className="text-xs text-gray-500">{adjustment.user.email}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}