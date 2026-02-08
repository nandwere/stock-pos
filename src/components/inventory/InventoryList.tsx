// components/inventory/InventoryList.tsx
'use client';

import { useState } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  Download,
  Upload,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/stock-calculations';
import Link from 'next/link';
import { useCategories, useProducts } from '@/lib/hooks/use-products';
import { useInventoryStore } from '@/lib/stores/inventory-store';
import { Category, Product } from '@/types';

export function InventoryList() {
  const { data: categories = [], } = useCategories() as { data: Category[] };
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const { data: products = [], isLoading, error } = useProducts() as { data: Product[], isLoading: boolean, error: any };

  // Zustand: Get UI state
  const searchQuery = useInventoryStore(state => state.searchQuery);
  const setSearchQuery = useInventoryStore(state => state.setSearchQuery);
  const getFilteredProducts = useInventoryStore(state => state.getFilteredProducts);

  // Apply filters
  const filteredProducts = getFilteredProducts();

  // Calculate totals
  const totalValue = products.reduce((sum, p) => Number(sum) + (Number(p.currentStock) * Number(p.costPrice)), 0);
  const lowStockCount = products.filter(p => Number(p.currentStock) <= Number(p.reorderLevel) && Number(p.currentStock) > 0).length;
  const outOfStockCount = products.filter(p => p.currentStock === 0).length;

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Manage your products and stock levels</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import
          </button>
          <Link
            href="/inventory/add"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">Total Products</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{products.length}</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-gray-600">Low Stock</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{lowStockCount}</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-gray-600">Out of Stock</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">Total Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, SKU, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((category: any) => (
              <option key={category.name} value={category.name}>
                {category === 'all' ? 'All Categories' : category.name}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Stock Levels</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No products found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {product.category?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(product.costPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(product.sellingPrice)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Margin: {((product.sellingPrice - product.costPrice) / product.sellingPrice * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {product.currentStock} {product.unit}
                      </div>
                      <div className="text-xs text-gray-500">
                        Min: {product.reorderLevel}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {product.currentStock === 0 ? (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Out of Stock
                        </span>
                      ) : (Number(product.currentStock) || 0) <= (Number(product.reorderLevel) || 0)? (
                        <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/inventory/${product.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this product?')) {
                              // setProducts(products.filter(p => p.id !== product.id));
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredProducts.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{filteredProducts.length}</span> of{' '}
            <span className="font-medium">{products.length}</span> products
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Previous
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}