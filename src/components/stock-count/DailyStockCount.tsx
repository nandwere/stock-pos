// components/stock-count/DailyStockCount.tsx
'use client';

import { useState } from 'react';
import {
  Package,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Save,
  Calculator} from 'lucide-react';
import { calculateStockVariance, formatCurrency } from '@/lib/stock-calculations';
import { useProducts } from '@/lib/hooks/use-products';
import { StockCountEntry } from '@/types';
import { useCreateStockCount } from '@/lib/hooks/use-stock-count';


export function DailyStockCount() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entries, setEntries] = useState<StockCountEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSummary, setShowSummary] = useState(false);
  const { data: products = [], isLoading, error } = useProducts();
  const createStockCount = useCreateStockCount();

  // Load products and today's sales data
  // In real app, fetch from API
  const loadData = async () => {
    // Simulated data
    const mockEntries: StockCountEntry[] = products.map(product => ({
      productId: product.id,
      product,
      openingStock: product.currentStock + 10, // Simulated opening
      recordedSales: 5, // Simulated sales
      expectedStock: product.currentStock + 10 - 5,
      actualStock: null,
      variance: null,
      estimatedRevenue: null,
      notes: ''
    }));

    setEntries(mockEntries);
  };

  // Update actual stock count
  const updateActualStock = (productId: string, actualStock: number) => {
    setEntries(entries.map(entry => {
      if (entry.productId === productId) {
        const variance = calculateStockVariance(
          entry.openingStock,
          entry.recordedSales,
          actualStock,
          entry.product.sellingPrice
        );

        return {
          ...entry,
          actualStock,
          variance: variance.variance,
          estimatedRevenue: variance.estimatedRevenue
        };
      }
      return entry;
    }));
  };

  // Update notes
  const updateNotes = (productId: string, notes: string) => {
    setEntries(entries.map(entry =>
      entry.productId === productId ? { ...entry, notes } : entry
    ));
  };

  // Calculate summary
  const summary = entries.reduce((acc, entry) => {
    if (entry.actualStock === null) return acc;

    const isMissing = entry.variance !== null && entry.variance < 0;
    const isExcess = entry.variance !== null && entry.variance > 0;

    return {
      totalProducts: acc.totalProducts + 1,
      countedProducts: acc.countedProducts + 1,
      missingStock: isMissing ? acc.missingStock + Math.abs(entry.variance!) : acc.missingStock,
      excessStock: isExcess ? acc.excessStock + entry.variance! : acc.excessStock,
      estimatedUnrecordedRevenue: acc.estimatedUnrecordedRevenue + (entry.estimatedRevenue || 0),
      productsWithVariance: (entry.variance !== 0) ? acc.productsWithVariance + 1 : acc.productsWithVariance
    };
  }, {
    totalProducts: entries.length,
    countedProducts: 0,
    missingStock: 0,
    excessStock: 0,
    estimatedUnrecordedRevenue: 0,
    productsWithVariance: 0
  });

  // Save stock count
  const handleSave = async () => {
    try {
      const uncountedProducts = entries.filter(e => e.actualStock === null);

      if (uncountedProducts.length > 0) {
        const confirm = window.confirm(
          `${uncountedProducts.length} products haven't been counted. Continue anyway?`
        );
        if (!confirm) return;
      }

      // In real app, save to API
      console.log('Saving stock count:', entries);

      createStockCount.mutateAsync({counts: entries });
      setShowSummary(true);
    } catch (error) {
      console.error('Error adding product:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to add product. Please try again.',
      //   type: 'destructive'
      // });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['all', ...new Set(products.map(p => p.category))];
  const filteredEntries = selectedCategory === 'all'
    ? entries
    : entries.filter(e => e.product.category === selectedCategory);

  return (
    <div className="max-w-9xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Stock Count</h1>
          <p className="text-gray-600 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <div className="flex gap-3">
          {entries.length === 0 ? (
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Start Stock Count
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                {showSummary ? 'Hide' : 'Show'} Summary
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2 disabled:bg-gray-300"
              >
                <Save className="w-5 h-5" />
                Save Count
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {showSummary && entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {summary.countedProducts}/{summary.totalProducts}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {((summary.countedProducts / summary.totalProducts) * 100).toFixed(0)}% Complete
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Missing Stock</span>
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {summary.missingStock}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Units unaccounted for
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Excess Stock</span>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {summary.excessStock}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Extra units found
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Estimated Loss</span>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.estimatedUnrecordedRevenue)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Unrecorded sales value
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      {entries.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Category:</span>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {category === 'all' ? 'All' : category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stock Count Table */}
      {entries.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Opening
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Sold
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Expected
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Actual Count
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Variance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEntries.map(entry => (
                  <tr key={entry.productId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {entry.product.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {entry.product.sku}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {entry.openingStock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-blue-600">
                        {entry.recordedSales}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {entry.expectedStock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={entry.actualStock ?? ''}
                        onChange={(e) => updateActualStock(
                          entry.productId,
                          parseFloat(e.target.value) || 0
                        )}
                        placeholder="Count"
                        className="w-24 px-3 py-2 text-gray-600 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {entry.variance !== null && (
                        <div className="flex items-center justify-center gap-1">
                          {entry.variance < 0 ? (
                            <>
                              <TrendingDown className="w-4 h-4 text-red-600" />
                              <span className="font-medium text-red-600">
                                {entry.variance}
                              </span>
                            </>
                          ) : entry.variance > 0 ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-green-600">
                                +{entry.variance}
                              </span>
                            </>
                          ) : (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={entry.notes}
                        onChange={(e) => updateNotes(entry.productId, e.target.value)}
                        placeholder="Add notes..."
                        className="w-full px-3 py-2 border border-gray-300 text-gray-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Stock Count Started
          </h3>
          <p className="text-gray-600 mb-4">
            Click the button above to begin today's stock count
          </p>
        </div>
      )}
    </div>
  );
}
