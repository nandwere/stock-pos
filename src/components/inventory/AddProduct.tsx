'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { useCategories, useCreateProduct, useProduct, useUpdateProduct } from '@/lib/hooks/use-products';
import { Category } from '@/types';
import { useToast } from '../ui/toast-provider';
import Loading from '@/app/(dashboard)/inventory/[id]/edit/loading';
import { ProductImageUpload } from '@/components/ProductImageUpload';

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
  showOnStorefront: boolean;
  isService: boolean;
}

const UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'box', 'pack', 'bottle'];

export default function AddProductPage() {
  const params = useParams();
  const router = useRouter();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categories = [], } = useCategories() as { data: Category[] };
  const productId = params.id as string;

  const { data: product, isLoading: isProductLoading } = useProduct(productId);

  const isNew = !productId;

  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const [formData, setFormData] = useState<FormData>({
    name: product?.name || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    category: product?.category?.id || '',
    costPrice: product?.costPrice?.toString() || '',
    sellingPrice: product?.sellingPrice?.toString() || '',
    currentStock: product?.currentStock?.toString() || '',
    reorderLevel: product?.reorderLevel?.toString() || '5',
    unit: product?.unit || 'pcs',
    description: product?.description || '',
    isActive: product?.isActive !== undefined ? product.isActive : true,
    showOnStorefront: product?.showOnStorefront !== undefined ? product.showOnStorefront : true,
    isService: product?.isService !== undefined ? product.isService : false
  });

  const [showMarginWarning, setShowMarginWarning] = useState(false);

  useEffect(() => {
    if (product && !isProductLoading) {
      setFormData(prev => ({
        name: product.name,
        sku: product?.sku,
        barcode: product?.barcode,
        category: product?.category?.id,
        costPrice: product?.costPrice?.toString() || '',
        sellingPrice: product?.sellingPrice?.toString() || '',
        currentStock: product?.currentStock?.toString() || '',
        reorderLevel: product?.reorderLevel?.toString() || '5',
        unit: product?.unit || 'pcs',
        description: product?.description || '',
        isActive: product?.isActive !== undefined ? product.isActive : true,
        showOnStorefront: product?.showOnStorefront !== undefined ? product.showOnStorefront : true,
        isService: product?.isService ?? false,
      }));
    }

  }, [product])

  // Calculate margin
  const costPrice = parseFloat(formData.costPrice) || 0;
  const sellingPrice = parseFloat(formData.sellingPrice) || 0;
  const margin = sellingPrice > 0
    ? ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(3)
    : '0.000';

  // Used for the sidebar preview (value/status/alert). parseFloat, not
  // parseInt — currentStock and reorderLevel are Decimal(10,3) in the
  // schema, so a value like "15.75" truncating to 15 via parseInt would
  // misreport stock status for anything sold by weight/volume rather than
  // whole units.
  const currentStockNum = parseFloat(formData.currentStock) || 0;
  const reorderLevelNum = parseFloat(formData.reorderLevel) || 0;

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.costPrice || parseFloat(formData.costPrice) < 0) {
      newErrors.costPrice = 'Valid cost price is required';
    }

    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
      newErrors.sellingPrice = 'Valid selling price is required';
    }

    if (parseFloat(formData.sellingPrice) < parseFloat(formData.costPrice)) {
      newErrors.sellingPrice = 'Selling price cannot be less than cost price';
    }

    // Stock fields are meaningless for services — skip entirely rather than
    // forcing the user to type a fake "999999" to get past validation
    if (!formData.isService) {
      if (formData.currentStock === '' || parseFloat(formData.currentStock) < 0) {
        newErrors.currentStock = 'Valid stock quantity is required';
      }
      if (!formData.reorderLevel || parseInt(formData.reorderLevel) < 0) {
        newErrors.reorderLevel = 'Valid reorder level is required';
      }
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
      toast({
        title: 'Validation Error',
        description: 'Please check the form for errors',
        variant: 'destructive'
      });
      return;
    }

    // Check for negative margin
    if (parseFloat(margin) < 0) {
      if (!confirm('Your selling price is below cost. This will result in a loss. Do you want to continue?')) {
        return;
      }
    }

    setIsSubmitting(true);

    // NOTE: deliberately does NOT include an `id` field. The previous
    // version set `id: Date.now().toString()` here unconditionally — for
    // an update, that value would flow into the payload alongside the
    // real product being edited. If the update API spreads this object
    // into a Prisma `data` argument without stripping `id`, it would
    // attempt to change the product's PRIMARY KEY on every save, breaking
    // every foreign key that points at it (SaleItem, StockAdjustment,
    // StockCount, OrderItem, ...). Creation should let the database
    // generate the real id (Prisma's `@default(cuid())`), not a client
    // timestamp string that isn't even a valid cuid.
    const productPayload = {
      name: formData.name,
      sku: formData.sku,
      barcode: formData.barcode || undefined,
      category: formData.category,
      costPrice: parseFloat(formData.costPrice),
      sellingPrice: parseFloat(formData.sellingPrice),
      currentStock: parseFloat(formData.currentStock),
      reorderLevel: parseFloat(formData.reorderLevel),
      unit: formData.unit,
      description: formData.description,
      isActive: formData.isActive,
      showOnStorefront: formData.showOnStorefront,
      updatedAt: new Date().toISOString(),
      isService: formData.isService,
      ...(isNew ? { createdAt: new Date().toISOString() } : {}),
    };

    try {
      if (isNew) {
        await createProduct.mutateAsync(productPayload);
        toast({
          title: 'Product added',
          description: `${formData.name} has been added successfully`,
          variant: 'default'
        });
      } else {
        await updateProduct.mutateAsync({ id: product.id, data: productPayload });
        toast({
          title: 'Product updated',
          description: `${formData.name} has been updated successfully`,
          variant: 'default'
        });
      }

      router.push('/inventory');
      router.refresh();
    } catch (error) {
      console.error(`Error ${isNew ? 'creating' : 'updating'} product:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${isNew ? 'add' : 'update'} product. Please try again.`,
        variant: 'destructive'
      });
    } finally {
      // Now runs only after the mutation actually settles — previously
      // this fired almost immediately (the mutateAsync calls weren't
      // awaited), so the spinner would disappear and the submit button
      // would re-enable well before the request finished, allowing a
      // double-submit if the user clicked again.
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

  if (isProductLoading) {
    return <Loading />;
  }

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
            <h1 className="text-2xl font-bold text-gray-900">
              {isNew ? 'Add New Product' : 'Edit Product'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isNew ? 'Add a new product to your inventory' : 'Update product details'}
            </p>
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

                {/* Is Service toggle — put this right after the Category field in the Product Information card */}
                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isService"
                    checked={formData.isService}
                    onChange={(e) => handleChange('isService', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isService" className="text-sm font-medium text-gray-700">
                    This is a service, not a physical product (e.g. milling, repackaging) — no stock tracking
                  </label>
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
                    {/* NOTE: hardcoded "$" — your Merchant model has a
                        per-tenant `currency` field (e.g. "KES"), and the
                        rest of the app (storefront) formats money with
                        Intl.NumberFormat against that currency. This input
                        doesn't have access to the merchant's currency from
                        here, so it's left as-is rather than guessing —
                        worth passing merchant currency down as a prop if
                        this component doesn't already have it some other
                        way. */}
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={formData.costPrice}
                      onChange={(e) => handleChange('costPrice', e.target.value)}
                      className={`w-full pl-8 pr-4 py-2 border text-gray-900 placeholder-gray-400  rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.costPrice ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="0.000"
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
                      step="0.001"
                      min="0"
                      value={formData.sellingPrice}
                      onChange={(e) => handleChange('sellingPrice', e.target.value)}
                      className={`w-full pl-8 pr-4 py-2 text-gray-900 placeholder-gray-400  border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.sellingPrice ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="0.000"
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

                {/* Current Stock — replace the existing block */}
                {!formData.isService && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Current Stock *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={'0.001'}
                      value={formData.currentStock}
                      onChange={(e) => handleChange('currentStock', e.target.value)}
                      className={`w-full px-4 py-2 border text-gray-900 placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.currentStock ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="0.000"
                    />
                    {errors.currentStock && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.currentStock}
                      </p>
                    )}
                  </div>
                )}

                {/* Reorder Level — same wrap */}
                {!formData.isService && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Reorder Level *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={formData.reorderLevel}
                      onChange={(e) => handleChange('reorderLevel', e.target.value)}
                      className={`w-full px-4 py-2 border text-gray-900 placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.reorderLevel ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="5"
                    />
                    {errors.reorderLevel && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.reorderLevel}
                      </p>
                    )}
                  </div>
                )}

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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showOnStorefront"
                  checked={formData.showOnStorefront}
                  disabled={!formData.isActive}
                  onChange={(e) => handleChange('showOnStorefront', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <label
                  htmlFor="showOnStorefront"
                  className={`text-sm font-medium ${formData.isActive ? 'text-gray-700' : 'text-gray-400'}`}
                >
                  Show this product on the public online store
                </label>
              </div>
              <p className="text-xs text-gray-400 pl-6 -mt-2">
                {formData.isActive
                  ? "Uncheck to sell in-store only — it stays out of online/delivery orders without deactivating it entirely."
                  : 'An inactive product is never shown online, regardless of this setting.'}
              </p>
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
                    {isNew ? 'Adding...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isNew ? 'Add Product' : 'Update Product'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            {/* Product Image */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Image</h3>

              {isNew ? (
                <div className="flex items-start gap-3 text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Save the product first, then come back here to add a photo.</span>
                </div>
              ) : product ? (
                <ProductImageUpload
                  productId={product.id}
                  currentImageUrl={product?.imageUrl}
                  onUploaded={() => {
                    toast({
                      title: 'Image updated',
                      description: 'Product image saved.',
                      variant: 'default',
                    });
                  }}
                />
              ) : (
                <div className="flex items-start gap-3 text-sm text-red-500 bg-red-50 rounded-lg p-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Product not found — can't attach an image.</span>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Preview</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Product Value</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(currentStockNum * costPrice)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Stock Status</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${currentStockNum === 0
                    ? 'bg-red-100 text-red-800'
                    : currentStockNum <= reorderLevelNum
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-green-100 text-green-800'
                    }`}>
                    {currentStockNum === 0
                      ? 'Out of Stock'
                      : currentStockNum <= reorderLevelNum
                        ? 'Low Stock'
                        : 'In Stock'}
                  </span>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600 mb-2">Stock Alert</div>
                  <div className="text-sm text-gray-900">
                    {currentStockNum <= reorderLevelNum ? (
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
