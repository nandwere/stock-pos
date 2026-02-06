// app/(dashboard)/page.tsx - Main Dashboard
import {
  ShoppingCart,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Users,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '@/lib/stock-calculations';

interface DashboardStats {
  todaySales: number;
  salesCount: number;
  lowStockItems: number;
  totalInventoryValue: number;
  salesChange: number;
  activeWorkers: number;
}

export default async function DashboardPage() {
  // In real app, fetch from API
  const stats: DashboardStats = {
    todaySales: 12450,
    salesCount: 48,
    lowStockItems: 7,
    totalInventoryValue: 245000,
    salesChange: 12.5,
    activeWorkers: 3
  };

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
            <div className="flex items-center gap-1 text-sm font-medium text-green-600">
              <TrendingUp className="w-4 h-4" />
              +{stats.salesChange}%
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Today's Sales</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.todaySales)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{stats.salesCount} transactions</p>
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
              {formatCurrency(stats.totalInventoryValue)}
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
            <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</p>
            <p className="text-xs text-orange-600 mt-1 font-medium">Requires attention</p>
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
            <p className="text-2xl font-bold text-gray-900">{stats.activeWorkers}</p>
            <p className="text-xs text-gray-500 mt-1">on duty now</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="lg:col-span-2">
          <RecentSales />
        </div>

        {/* Low Stock Items */}
        <div>
          <LowStockAlert />
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Sales Overview</h2>
          <select className="px-3 py-1 border border-gray-300 rounded text-sm">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 3 months</option>
          </select>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-400">
          {/* Add chart library like recharts here */}
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto mb-2" />
            <p>Sales chart will be displayed here</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Recent Sales Component
async function RecentSales() {
  // Fetch recent sales from API
  const recentSales = [
    { id: '1', number: 'SALE-240201-001', time: '10:30 AM', items: 3, total: 450, cashier: 'John Doe' },
    { id: '2', number: 'SALE-240201-002', time: '11:15 AM', items: 2, total: 320, cashier: 'Jane Smith' },
    { id: '3', number: 'SALE-240201-003', time: '12:00 PM', items: 5, total: 890, cashier: 'John Doe' },
    { id: '4', number: 'SALE-240201-004', time: '01:45 PM', items: 1, total: 150, cashier: 'Alice Johnson' },
    { id: '5', number: 'SALE-240201-005', time: '02:30 PM', items: 4, total: 670, cashier: 'Jane Smith' },
  ];

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
      <div className="divide-y divide-gray-200">
        {recentSales.map(sale => (
          <div key={sale.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded">
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{sale.number}</p>
                    <p className="text-sm text-gray-500">
                      {sale.items} items • {sale.time} • {sale.cashier}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{formatCurrency(sale.total)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Low Stock Alert Component
async function LowStockAlert() {
  const lowStockItems = [
    { id: '1', name: 'Bread - White', sku: 'BREAD-W', stock: 5, reorder: 20, unit: 'pcs' },
    { id: '2', name: 'Milk 1L', sku: 'MILK-1L', stock: 8, reorder: 30, unit: 'pcs' },
    { id: '3', name: 'Eggs Tray', sku: 'EGGS-30', stock: 3, reorder: 15, unit: 'tray' },
    { id: '4', name: 'Rice 2kg', sku: 'RICE-2K', stock: 6, reorder: 25, unit: 'pcs' },
  ];

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
      <div className="divide-y divide-gray-200">
        {lowStockItems.map(item => (
          <div key={item.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{item.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-orange-600">
                  {item.stock} {item.unit}
                </p>
                <p className="text-xs text-gray-500">Min: {item.reorder}</p>
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${(item.stock / item.reorder) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}