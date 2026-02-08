// app/inventory/stock-adjustments/components/AdjustmentForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, Minus, AlertCircle, Package, Search, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { CreateAdjustmentDTO, Product, TransactionType } from '@/types';


interface AdjustmentFormProps {
  onSubmit: (data: CreateAdjustmentDTO) => Promise<void>;
  isSubmitting: boolean;
  products: Product[];
}

export function AdjustmentForm({ onSubmit, isSubmitting, products }: AdjustmentFormProps) {
  const [formData, setFormData] = useState({
    productId: '',
    type: TransactionType.ADJUSTMENT_ADD,
    quantity: '',
    reason: '',
    notes: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Set selected product when productId changes
  useEffect(() => {
    if (formData.productId) {
      const product = products.find(p => p.id === formData.productId);
      setSelectedProduct(product || null);
    } else {
      setSelectedProduct(null);
    }
  }, [formData.productId, products]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.productId) {
      newErrors.productId = 'Please select a product';
    }
    
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }
    
    // Check if removal quantity exceeds current stock
    if (selectedProduct && 
        (formData.type === TransactionType.ADJUSTMENT_REMOVE || 
         formData.type === TransactionType.DAMAGE ||
         formData.type === TransactionType.THEFT)) {
      const currentStock = Number(selectedProduct.currentStock);
      const adjustmentQuantity = parseFloat(formData.quantity);
      
      if (adjustmentQuantity > currentStock) {
        newErrors.quantity = `Cannot remove more than current stock (${currentStock} ${selectedProduct.unit})`;
      }
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }
    
    await onSubmit({
      productId: formData.productId,
      type: formData.type,
      quantity: parseFloat(formData.quantity),
      reason: formData.reason,
      notes: formData.notes || undefined,
    });
  };

  const adjustmentTypes = [
    { 
      value: TransactionType.ADJUSTMENT_ADD, 
      label: 'Add Stock', 
      icon: Plus, 
      color: 'text-green-700', 
      bgColor: 'bg-green-50 border-green-200',
      description: 'Increase stock quantity'
    },
    { 
      value: TransactionType.ADJUSTMENT_REMOVE, 
      label: 'Remove Stock', 
      icon: Minus, 
      color: 'text-red-700', 
      bgColor: 'bg-red-50 border-red-200',
      description: 'Decrease stock quantity'
    },
    { 
      value: TransactionType.DAMAGE, 
      label: 'Damaged Goods', 
      icon: AlertCircle, 
      color: 'text-red-700', 
      bgColor: 'bg-red-50 border-red-200',
      description: 'Stock damaged or unusable'
    },
    { 
      value: TransactionType.THEFT, 
      label: 'Theft/Loss', 
      icon: AlertCircle, 
      color: 'text-red-700', 
      bgColor: 'bg-red-50 border-red-200',
      description: 'Missing or stolen stock'
    },
    { 
      value: TransactionType.EXPIRY, 
      label: 'Expired Goods', 
      icon: AlertCircle, 
      color: 'text-amber-700', 
      bgColor: 'bg-amber-50 border-amber-200',
      description: 'Stock past expiry date'
    },
    { 
      value: TransactionType.CORRECTION, 
      label: 'Correction', 
      icon: Package, 
      color: 'text-blue-700', 
      bgColor: 'bg-blue-50 border-blue-200',
      description: 'Correct stock count error'
    },
    { 
      value: TransactionType.RETURN, 
      label: 'Customer Return', 
      icon: Package, 
      color: 'text-purple-700', 
      bgColor: 'bg-purple-50 border-purple-200',
      description: 'Customer returned product'
    },
    { 
      value: TransactionType.SAMPLE, 
      label: 'Sample/Test', 
      icon: Package, 
      color: 'text-indigo-700', 
      bgColor: 'bg-indigo-50 border-indigo-200',
      description: 'Used for samples or testing'
    },
  ];

  // Calculate new stock
  const currentStock = selectedProduct ? Number(selectedProduct.currentStock) : 0;
  const quantity = parseFloat(formData.quantity) || 0;
  const isAddition = formData.type === TransactionType.ADJUSTMENT_ADD;
  const newStock = isAddition ? currentStock + quantity : currentStock - quantity;
  const stockChange = isAddition ? quantity : -quantity;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Stock Adjustment</h2>
            <p className="text-gray-600">Adjust product stock levels with clear visibility</p>
          </div>
        </div>
        
        {/* Product Selection */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-gray-700" />
            <label className="block text-base font-semibold text-gray-900">
              Select Product <span className="text-red-600">*</span>
            </label>
          </div>
          
          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Type to search products by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 placeholder-gray-500 bg-white"
              />
            </div>
          </div>
          
          {/* Product Dropdown */}
          <div className="mb-3">
            <select
              value={formData.productId}
              onChange={(e) => handleChange('productId', e.target.value)}
              className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 bg-white font-medium ${
                errors.productId 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            >
              <option value="" className="text-gray-500">Choose a product from the list</option>
              {filteredProducts.map(product => (
                <option key={product.id} value={product.id} className="py-2">
                  {product.name} • SKU: {product.sku} • Stock: {Number(product.currentStock)} {product.unit}
                  {product.category && ` • ${product.category?.name}`}
                </option>
              ))}
            </select>
            
            {errors.productId && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-700 font-medium">{errors.productId}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Selected Product Info */}
          {selectedProduct && (
            <div className="p-4 bg-blue-50 border-2 border-blue-100 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Selected Product</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-blue-700">Product Name</p>
                  <p className="font-semibold text-gray-900 text-lg">{selectedProduct.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-blue-700">SKU</p>
                  <p className="font-mono font-semibold text-gray-900">{selectedProduct.sku}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-blue-700">Current Stock</p>
                  <p className="font-bold text-gray-900 text-xl">
                    {Number(selectedProduct.currentStock)} <span className="text-gray-700">{selectedProduct.unit}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Adjustment Type */}
        <div className="mb-8">
          <label className="block text-base font-semibold text-gray-900 mb-4">
            Adjustment Type <span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {adjustmentTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.type === type.value;
              
              return (
                <button
                  type="button"
                  key={type.value}
                  onClick={() => handleChange('type', type.value)}
                  className={`p-4 border-2 rounded-xl text-left transition-all duration-200 hover:scale-[1.02] ${
                    isSelected
                      ? `${type.bgColor} border-2 shadow-md`
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? type.bgColor : 'bg-gray-100'}`}>
                      <Icon className={`w-5 h-5 ${type.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold ${type.color}`}>{type.label}</span>
                        {isSelected && (
                          <div className="p-1 bg-white rounded">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-tight">{type.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity & Stock Preview */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quantity Input */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <label className="block text-base font-semibold text-gray-900">
                  Quantity <span className="text-red-600">*</span>
                </label>
                <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {selectedProduct?.unit || 'units'}
                </span>
              </div>
              
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                  className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 text-lg font-medium placeholder-gray-400 ${
                    errors.quantity 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="Enter quantity"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <span className="text-gray-600 font-medium">
                    {selectedProduct?.unit || 'units'}
                  </span>
                </div>
              </div>
              
              {errors.quantity && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-700 font-medium">{errors.quantity}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Stock Preview Card */}
            {selectedProduct && formData.quantity && !errors.quantity && (
              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-xl">
                <h3 className="font-semibold text-blue-900 mb-4">Stock Impact Preview</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                    <span className="text-gray-700 font-medium">Current Stock</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {currentStock} <span className="text-gray-600 text-lg">{selectedProduct.unit}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2">
                      {isAddition ? (
                        <>
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          <span className="text-green-700 font-medium">Addition</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-5 h-5 text-red-600" />
                          <span className="text-red-700 font-medium">Removal</span>
                        </>
                      )}
                    </div>
                    <span className={`text-xl font-bold ${isAddition ? 'text-green-700' : 'text-red-700'}`}>
                      {isAddition ? '+' : '-'}{quantity} {selectedProduct.unit}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-blue-100 rounded-lg border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-blue-900">New Stock</span>
                      <span className={`text-3xl font-bold ${newStock < 0 ? 'text-red-700' : 'text-blue-900'}`}>
                        {newStock} <span className="text-gray-700 text-xl">{selectedProduct.unit}</span>
                      </span>
                    </div>
                    <div className={`text-sm ${newStock < 0 ? 'text-red-600' : newStock === 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                      {newStock < 0 ? '⚠️ Warning: Negative stock' : 
                       newStock === 0 ? '⚠️ Stock will be empty' :
                       '✓ Stock level will be updated'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reason & Notes */}
        <div className="space-y-6">
          <div>
            <label className="block text-base font-semibold text-gray-900 mb-3">
              Reason for Adjustment <span className="text-red-600">*</span>
              <span className="block text-sm text-gray-600 font-normal mt-1">
                Clearly describe why this adjustment is needed
              </span>
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 placeholder-gray-500 text-base ${
                errors.reason 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="e.g., Found extra stock during inventory audit, Damaged during transit, etc."
            />
            {errors.reason && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-700 font-medium">{errors.reason}</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-900 mb-3">
              Additional Notes <span className="text-sm text-gray-600 font-normal">(Optional)</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 placeholder-gray-500 text-base"
              placeholder="Add any additional context, reference numbers, or details that would help track this adjustment..."
            />
            <p className="text-sm text-gray-500 mt-2">
              These notes will be saved in the adjustment history for audit purposes.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 mt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  productId: '',
                  type: TransactionType.ADJUSTMENT_ADD,
                  quantity: '',
                  reason: '',
                  notes: '',
                });
                setSelectedProduct(null);
                setErrors({});
              }}
              disabled={isSubmitting}
              className="px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Clear Form
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-lg">Processing Adjustment...</span>
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6" />
                  <span className="text-lg">Create Stock Adjustment</span>
                </>
              )}
            </button>
          </div>
          
          {/* Form Status */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-700 font-medium">Form Status</p>
                <p className="text-sm text-gray-600">
                  {!formData.productId ? 'Select a product to begin' :
                   !formData.quantity ? 'Enter quantity to continue' :
                   !formData.reason ? 'Add reason to complete' :
                   'Ready to submit'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}