// app/(dashboard)/page.tsx - Main Dashboard with Real Data
'use client';

import { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Users,
  Calendar,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '@/lib/stock-calculations';
import { useDashboardStats } from '@/lib/hooks/use-dashboard';
import { useRecentSales } from '@/lib/hooks/use-sales';
import { useLowStockProducts } from '@/lib/hooks/use-products';
import Link from 'next/link';

interface DashboardStats {
  todaySales: number;
  salesCount: number;
  lowStockItems: number;
  totalInventoryValue: number;
  salesChange: number;
  activeWorkers: number;
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentSales = [], isLoading: salesLoading } = useRecentSales(5);
  const { data: lowStockItems = [], isLoading: stockLoading } = useLowStockProducts(4);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Sales */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            {stats?.salesChange !== undefined && stats.salesChange !== 0 && (
              <div className={`flex items-center gap-1 text-sm font-medium ${stats.salesChange > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                <TrendingUp className={`w-4 h-4 ${stats.salesChange < 0 ? 'rotate-180' : ''}`} />
                {stats.salesChange > 0 ? '+' : ''}{stats?.salesChange?.toFixed(1)}%
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Today's Sales</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats?.todaySales || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{stats?.salesCount || 0} transactions</p>
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Inventory Value</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats?.totalInventoryValue || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">at cost price</p>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Low Stock Items</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.lowStockItems || 0}</p>
            <p className="text-xs text-orange-600 mt-1 font-medium">
              {(stats?.lowStockItems || 0) > 0 ? 'Requires attention' : 'All good'}
            </p>
          </div>
        </div>

        {/* Active Workers */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Active Workers</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.activeWorkers || 0}</p>
            <p className="text-xs text-gray-500 mt-1">on duty now</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="lg:col-span-2">
          <RecentSales sales={recentSales} isLoading={salesLoading} />
        </div>

        {/* Low Stock Items */}
        <div>
          <LowStockAlert items={lowStockItems} isLoading={stockLoading} />
        </div>
      </div>

      {/* Sales Chart */}
      <SalesChart />
    </div>
  );
}

// Recent Sales Component
function RecentSales({ sales, isLoading }: { sales: any[], isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-12">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Sales</h2>
          <a href="/sales" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all
          </a>
        </div>
      </div>

      {sales.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {sales.map(sale => (
            <Link
              href={`/sales/${sale.id}`}
              key={sale.id}
              className="block p-4 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{sale.saleNumber || sale.id}</p>
                      <p className="text-sm text-gray-500">
                        {sale.itemCount || sale.items?.length || 0} items • {' '}
                        {new Date(sale.createdAt || sale.date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} • {' '}
                        {sale.cashier?.name || sale.createdBy || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    {formatCurrency(sale.totalAmount || sale.total || 0)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-gray-500">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No sales today yet</p>
        </div>
      )}
    </div>
  );
}

// Low Stock Alert Component
function LowStockAlert({ items, isLoading }: { items: any[], isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-12">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Low Stock Alert</h2>
          <a href="/inventory" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all
          </a>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {items.map(item => {
            const stockPercentage = (Number(item.currentStock) / Number(item.reorderLevel)) * 100;

            return (
              <div key={item.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-orange-600">
                      {item.currentStock} {item.unit}
                    </p>
                    <p className="text-xs text-gray-500">Min: {item.reorderLevel}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${stockPercentage < 25
                        ? 'bg-red-500'
                        : stockPercentage < 50
                          ? 'bg-orange-500'
                          : 'bg-yellow-500'
                        }`}
                      style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>All stock levels are healthy</p>
        </div>
      )}
    </div>
  );
}

// Sales Chart Component
function SalesChart() {
  const [timeRange, setTimeRange] = useState('7');
  const { data: chartData, isLoading } = useSalesChartData(timeRange);

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Sales Overview</h2>
        <select
          className="px-3 py-1 border border-gray-300 rounded text-sm"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 3 months</option>
        </select>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : chartData && chartData.length > 0 ? (
        <div className="h-64">
          {/* TODO: Add chart library like recharts */}
          <SimpleSalesChart data={chartData} />
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto mb-2" />
            <p>No sales data available for this period</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple Sales Chart (placeholder - replace with recharts)
function SimpleSalesChart({ data }: { data: any[] }) {
  const maxValue = Math.max(...data.map(d => d.amount));

  return (
    <div className="h-full flex items-end gap-2 px-4">
      {data.map((item, index) => {
        const height = (item.amount / maxValue) * 100;

        return (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
              style={{ height: `${height}%` }}
              title={`${item.date}: ${formatCurrency(item.amount)}`}
            />
            <div className="text-xs text-gray-500 mt-2">
              {new Date(item.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Hook for sales chart data
function useSalesChartData(days: string) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchChartData() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/sales/chart?days=${days}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchChartData();
  }, [days]);

  return { data, isLoading };
}