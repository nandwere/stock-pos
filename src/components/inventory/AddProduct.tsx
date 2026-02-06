'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Package,
  X,
  AlertCircle,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/stock-calculations';
import { useInventoryStore } from '@/lib/stores/inventory-store';
import { useCategories, useCreateProduct } from '@/lib/hooks/use-products';
import { Category } from '@/types';
// import { useToast } from '@/lib/hooks/use-toast';

interface FormData {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  currentStock: string;
  reorderLevel: string;
  unit: string;
  description: string;
  isActive: boolean;
}

const UNITS = ['pcs', 'kg', 'g', 'L', 'mL', 'm', 'cm', 'box', 'pack', 'bottle'];

export default function AddProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();
  const { data: categories = [], } = useCategories() as { data: Category[] };
  // const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const [formData, setFormData] = useState<FormData>({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    costPrice: '',
    sellingPrice: '',
    currentStock: '',
    reorderLevel: '5',
    unit: 'pcs',
    description: '',
    isActive: true
  });

  const [showMarginWarning, setShowMarginWarning] = useState(false);

  // Calculate margin
  const costPrice = parseFloat(formData.costPrice) || 0;
  const sellingPrice = parseFloat(formData.sellingPrice) || 0;
  const margin = sellingPrice > 0
    ? ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(2)
    : '0.00';

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    // if (!formData.sku.trim()) {
    //   newErrors.sku = 'SKU is required';
    // }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.costPrice || parseFloat(formData.costPrice) <= 0) {
      newErrors.costPrice = 'Valid cost price is required';
    }

    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
      newErrors.sellingPrice = 'Valid selling price is required';
    }

    if (parseFloat(formData.sellingPrice) < parseFloat(formData.costPrice)) {
      newErrors.sellingPrice = 'Selling price cannot be less than cost price';
    }

    if (formData.currentStock === '' || parseInt(formData.currentStock) < 0) {
      newErrors.currentStock = 'Valid stock quantity is required';
    }

    if (!formData.reorderLevel || parseInt(formData.reorderLevel) < 0) {
      newErrors.reorderLevel = 'Valid reorder level is required';
    }

    if (!formData.unit) {
      newErrors.unit = 'Unit is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      console.log('Invalid Form');
      // toast({
      //   title: 'Validation Error',
      //   description: 'Please check the form for errors',
      //   type: 'destructive'
      // });
      return;
    }

    // Check for negative margin
    if (parseFloat(margin) < 0) {
      if (!confirm('Your selling price is below cost. This will result in a loss. Do you want to continue?')) {
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const newProduct = {
        id: Date.now().toString(),
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode || undefined,
        category: formData.category,
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        currentStock: parseInt(formData.currentStock),
        reorderLevel: parseInt(formData.reorderLevel),
        unit: formData.unit,
        description: formData.description,
        isActive: formData.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      createProduct.mutateAsync(newProduct);

      // toast({
      //   title: 'Product Added',
      //   description: `${formData.name} has been added successfully`,
      //   type: 'default'
      // });

      // Redirect to inventory list
      router.push('/inventory');
      router.refresh();

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

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Check for margin warning
    if ((field === 'costPrice' || field === 'sellingPrice') && value) {
      const cost = field === 'costPrice' ? parseFloat(value as string) : costPrice;
      const selling = field === 'sellingPrice' ? parseFloat(value as string) : sellingPrice;
      setShowMarginWarning(selling > 0 && ((selling - cost) / selling * 100) < 10);
    }
  };

  const generateSku = () => {
    const prefix = formData.category.slice(0, 3).toUpperCase() || 'PRO';
    const random = Math.floor(1000 + Math.random() * 9000);
    const sku = `${prefix}-${random}`;
    handleChange('sku', sku);
  };

  const generateBarcode = () => {
    const barcode = '8' + Math.floor(100000000000 + Math.random() * 900000000000).toString();
    handleChange('barcode', barcode);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
            <p className="text-gray-600 mt-1">Add a new product to your inventory</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full px-4 py-2 border text-gray-900 placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="e.g., Wireless Headphones"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* SKU */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      SKU
                    </label>
                    <button
                      type="button"
                      onClick={generateSku}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Generate SKU
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => handleChange('sku', e.target.value)}
                    className={`w-full px-4 py-2 border text-gray-900 placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.sku ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="e.g., PRO-1234"
                  />
                  {errors.sku && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.sku}
                    </p>
                  )}
                </div>

                {/* Barcode */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Barcode (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={generateBarcode}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Generate Barcode
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => handleChange('barcode', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 123456789012"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className={`w-full px-4 py-2 border text-gray-900 placeholder-gray-400  rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.category ? 'border-red-500' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.category}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border text-gray-900 placeholder-gray-400 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Product description..."
                  />
                </div>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Stock</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cost Price */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Cost Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.costPrice}
                      onChange={(e) => handleChange('costPrice', e.target.value)}
                      className={`w-full pl-8 pr-4 py-2 border text-gray-900 placeholder-gray-400  rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.costPrice ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.costPrice && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.costPrice}
                    </p>
                  )}
                </div>

                {/* Selling Price */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Selling Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.sellingPrice}
                      onChange={(e) => handleChange('sellingPrice', e.target.value)}
                      className={`w-full pl-8 pr-4 py-2 text-gray-900 placeholder-gray-400  border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.sellingPrice ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.sellingPrice && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.sellingPrice}
                    </p>
                  )}
                  {showMarginWarning && (
                    <p className="text-sm text-orange-600 flex items-center gap-1">
                      <Info className="w-4 h-4" />
                      Margin is low ({margin}%)
                    </p>
                  )}
                </div>

                {/* Margin Display */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Margin
                  </label>
                  <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-lg font-semibold text-gray-900">
                      {margin}%
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatCurrency(sellingPrice - costPrice)} profit per unit
                    </div>
                  </div>
                </div>

                {/* Current Stock */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Current Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => handleChange('currentStock', e.target.value)}
                    className={`w-full px-4 py-2 border text-gray-900 placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.currentStock ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="0"
                  />
                  {errors.currentStock && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.currentStock}
                    </p>
                  )}
                </div>

                {/* Reorder Level */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Reorder Level *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorderLevel}
                    onChange={(e) => handleChange('reorderLevel', e.target.value)}
                    className={`w-full px-4 py-2 border text-gray-900 placeholder-gray-400  rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.reorderLevel ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="5"
                  />
                  {errors.reorderLevel && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.reorderLevel}
                    </p>
                  )}
                </div>

                {/* Unit */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Unit *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => handleChange('unit', e.target.value)}
                    className={`w-full px-4 py-2 text-gray-900 placeholder-gray-400  border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.unit ? 'border-red-500' : 'border-gray-300'
                      }`}
                  >
                    {UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                  {errors.unit && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.unit}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Product is active and available for sale
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3">
              <Link
                href="/inventory"
                className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Add Product
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Preview</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Product Value</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency((parseInt(formData.currentStock) || 0) * costPrice)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Stock Status</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${(parseInt(formData.currentStock) || 0) === 0
                    ? 'bg-red-100 text-red-800'
                    : (parseInt(formData.currentStock) || 0) <= (parseInt(formData.reorderLevel) || 0)
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-green-100 text-green-800'
                    }`}>
                    {(parseInt(formData.currentStock) || 0) === 0
                      ? 'Out of Stock'
                      : (parseInt(formData.currentStock) || 0) <= (parseInt(formData.reorderLevel) || 0)
                        ? 'Low Stock'
                        : 'In Stock'}
                  </span>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600 mb-2">Stock Alert</div>
                  <div className="text-sm text-gray-900">
                    {(parseInt(formData.currentStock) || 0) <= (parseInt(formData.reorderLevel) || 0) ? (
                      <div className="flex items-center gap-2 text-orange-600">
                        <AlertCircle className="w-4 h-4" />
                        Stock is at or below reorder level
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600">
                        <Info className="w-4 h-4" />
                        Stock level is healthy
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Tips</h3>
              </div>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>SKU should be unique for each product</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Set reorder level based on sales velocity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Aim for at least 20% margin for profitability</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Deactivate products that are discontinued</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}