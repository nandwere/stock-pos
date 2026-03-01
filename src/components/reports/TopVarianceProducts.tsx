// components/reports/TopVarianceProducts.tsx
'use client';

import { TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/stock-calculations';
import { useProductVarianceReport } from '@/lib/hooks/use-stock-count';

interface TopVarianceProductsProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  selectedDate: string | null;
}

export function TopVarianceProducts({ dateRange, selectedDate }: TopVarianceProductsProps) {
  const { data: productVariances = [], isLoading } = useProductVarianceReport({
    startDate: selectedDate || dateRange.startDate,
    endDate: selectedDate || dateRange.endDate,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading product analysis...</p>
      </div>
    );
  }

  // Sort by absolute variance (highest discrepancies first)
  const sortedProducts = [...productVariances].sort(
    (a, b) => Math.abs(b.totalVariance) - Math.abs(a.totalVariance)
  );

  const topLosses = sortedProducts.filter((p) => p.totalVariance < 0).slice(0, 10);
  const topGains = sortedProducts.filter((p) => p.totalVariance > 0).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Top Losses */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Top Stock Losses
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Products with the highest missing stock
              </p>
            </div>
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Total Counts
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Missing Units
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Est. Loss
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Frequency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topLosses.length > 0 ? (
                topLosses.map((product, index) => (
                  <tr key={product.productId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-center">
                      <div
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          index === 0
                            ? 'bg-red-100 text-red-800'
                            : index === 1
                            ? 'bg-orange-100 text-orange-800'
                            : index === 2
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {product.productName}
                        </div>
                        <div className="text-sm text-gray-500">
                          SKU: {product.productSku}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">
                      {product.countOccurrences}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-red-600">
                          {Math.abs(product.totalVariance)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-red-600">
                      {formatCurrency(Math.abs(product.estimatedRevenueLoss))}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm text-gray-900">
                        {((product.countOccurrences / product.countOccurrences) * 100).toFixed(
                          0
                        )}
                        %
                      </div>
                      <div className="text-xs text-gray-500">
                        {product.countOccurrences} times
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No stock losses found 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Gains */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Top Stock Gains
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Products with the highest excess stock
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Total Counts
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Excess Units
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Est. Value
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Frequency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topGains.length > 0 ? (
                topGains.map((product, index) => (
                  <tr key={product.productId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-800 font-bold">
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {product.productName}
                        </div>
                        <div className="text-sm text-gray-500">
                          SKU: {product.productSku}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">
                      {product.countOccurrences}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-600">
                          +{product.totalVariance}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600">
                      {formatCurrency(product.estimatedRevenueLoss)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm text-gray-900">
                        {((product.countOccurrences / product.countOccurrences) * 100).toFixed(
                          0
                        )}
                        %
                      </div>
                      <div className="text-xs text-gray-500">
                        {product.countOccurrences} times
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No excess stock found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">Total Products Analyzed</div>
          <div className="text-3xl font-bold text-gray-900">
            {productVariances.length}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">Products with Variance</div>
          <div className="text-3xl font-bold text-orange-600">
            {productVariances.filter((p: { totalVariance: number; }) => p.totalVariance !== 0).length}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">Accuracy Rate</div>
          <div className="text-3xl font-bold text-green-600">
            {productVariances.length > 0
              ? (
                  ((productVariances.filter((p: { totalVariance: number; }) => p.totalVariance === 0).length /
                    productVariances.length) *
                    100)
                ).toFixed(1)
              : 0}
            %
          </div>
        </div>
      </div>
    </div>
  );
}