// components/reports/StockReportsPage.tsx
'use client';

import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, SetStateAction, useState } from 'react';
import {
  Calendar,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Download,
  Filter,
  Search,
  ChevronDown,
  BarChart3,
  PieChart,
  LineChart,
  FileText,
} from 'lucide-react';
import { formatCurrency } from '@/lib/stock-calculations';
import { useStockCountReports } from '@/lib/hooks/use-stock-count';
import { StockCountReport } from '@/types';
import { StockTrendsChart } from './StockTrendsChart';
import { VarianceChart } from './VarianceChart';
import { TopVarianceProducts } from './TopVarianceProducts';
import { DailyComparisonChart } from './DailyComparisonChart';

export function StockReportsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'daily' | 'products'>('overview');

  const { data: reports = [], isLoading } = useStockCountReports({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Calculate aggregate statistics
  const aggregateStats = reports.reduce(
    (acc: { totalCounts: number; totalVariance: any; totalMissingStock: any; totalExcessStock: any; totalEstimatedLoss: any; totalProductsCounted: any; productsWithVariance: any; }, report: { totalVariance: any; missingStock: any; excessStock: any; estimatedLoss: any; productsCounted: any; productsWithVariance: any; }) => ({
      totalCounts: acc.totalCounts + 1,
      totalVariance: acc.totalVariance + (report.totalVariance || 0),
      totalMissingStock: acc.totalMissingStock + (report.missingStock || 0),
      totalExcessStock: acc.totalExcessStock + (report.excessStock || 0),
      totalEstimatedLoss: acc.totalEstimatedLoss + (report.estimatedLoss || 0),
      totalProductsCounted: acc.totalProductsCounted + (report.productsCounted || 0),
      productsWithVariance: acc.productsWithVariance + (report.productsWithVariance || 0),
    }),
    {
      totalCounts: 0,
      totalVariance: 0,
      totalMissingStock: 0,
      totalExcessStock: 0,
      totalEstimatedLoss: 0,
      totalProductsCounted: 0,
      productsWithVariance: 0,
    }
  );

  // Get daily report if date is selected
  const selectedDailyReport = reports.find(
    (r: { date: string | null; }) => r.date === selectedDate
  );

  // Filter reports by search
  const filteredReports = reports.filter((report: { date: string; }) =>
    searchQuery
      ? report.date.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Products Counted',
      'Missing Stock',
      'Excess Stock',
      'Total Variance',
      'Estimated Loss',
      'Products with Variance',
    ];

    const rows = filteredReports.map((report: { date: any; productsCounted: any; missingStock: any; excessStock: any; totalVariance: any; estimatedLoss: any; productsWithVariance: any; }) => [
      report.date,
      report.productsCounted,
      report.missingStock,
      report.excessStock,
      report.totalVariance,
      report.estimatedLoss,
      report.productsWithVariance,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row: any[]) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-reports-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-9xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Reports</h1>
          <p className="text-gray-600 mt-1">
            Analyze stock count performance and identify trends
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* View Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              View Mode
            </label>
            <select
              value={viewMode}
              onChange={(e) =>
                setViewMode(e.target.value as 'overview' | 'daily' | 'products')
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="overview">Overview</option>
              <option value="daily">Daily Details</option>
              <option value="products">Product Analysis</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Stock Counts</span>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {aggregateStats.totalCounts}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {aggregateStats.totalProductsCounted} products total
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Missing Stock</span>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-600">
            {aggregateStats.totalMissingStock}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Units unaccounted for
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Excess Stock</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-600">
            {aggregateStats.totalExcessStock}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Extra units found
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Estimated Loss</span>
            <DollarSign className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-orange-600">
            {formatCurrency(aggregateStats.totalEstimatedLoss)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Total unrecorded revenue
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StockTrendsChart reports={reports} />
            <VarianceChart reports={reports} />
          </div>

          <DailyComparisonChart reports={reports} />
        </>
      )}

      {viewMode === 'daily' && (
        <>
          {/* Daily Reports Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Daily Stock Count Reports
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Products
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Missing
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Excess
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Variance
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Est. Loss
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReports.map((report: { id: Key | null | undefined; date: number | Date | SetStateAction<string | null>; productsCounted: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; missingStock: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; excessStock: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; totalVariance: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; estimatedLoss: number; productsWithVariance: number; }) => (
                    <tr
                      key={report.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedDate(String(report.date))}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(String(report.date)).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {report.productsCounted}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-red-600">
                          {report.missingStock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-green-600">
                          {report.excessStock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`text-sm font-medium ${
                            Number(report.totalVariance || 0) < 0
                              ? 'text-red-600'
                              : Number(report.totalVariance || 0) > 0
                              ? 'text-green-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {(Number(report.totalVariance || 0) > 0 ? '+' : '')}
                          {report.totalVariance}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-orange-600">
                        {formatCurrency(report.estimatedLoss)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {report.productsWithVariance === 0 ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Perfect
                          </span>
                        ) : report.productsWithVariance <=
                          (Number(report.productsCounted || 0) * 0.1) ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            Good
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Needs Attention
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(String(report?.date));
                            setViewMode('products');
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Daily Report Details */}
          {selectedDailyReport && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Report Details -{' '}
                  {new Date(selectedDailyReport.date).toLocaleDateString()}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">
                    Products Counted
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedDailyReport.productsCounted}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">
                    Variance Rate
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {(
                      (selectedDailyReport.productsWithVariance /
                        selectedDailyReport.productsCounted) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">
                    Accuracy Score
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {(
                      ((selectedDailyReport.productsCounted -
                        selectedDailyReport.productsWithVariance) /
                        selectedDailyReport.productsCounted) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                </div>
              </div>

              {/* Product-level details would go here */}
            </div>
          )}
        </>
      )}

      {viewMode === 'products' && (
        <TopVarianceProducts
          dateRange={dateRange}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}