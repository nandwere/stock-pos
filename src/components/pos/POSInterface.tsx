// components/pos/POSInterfaceWithState.tsx
'use client';

import { useState } from 'react';
import {
  Search,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  X,
  Loader2
} from 'lucide-react';
import { usePOSStore } from '@/lib/stores/pos-store';
import { useProducts } from '@/lib/hooks/use-products';
import { useCreateSale } from '@/lib/hooks/use-sales';
import { formatCurrency } from '@/lib/stock-calculations';

export function POSInterface() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Zustand store
  const cart = usePOSStore(state => state.cart);
  const addToCart = usePOSStore(state => state.addToCart);
  const removeFromCart = usePOSStore(state => state.removeFromCart);
  const updateQuantity = usePOSStore(state => state.updateQuantity);
  const clearCart = usePOSStore(state => state.clearCart);
  const getCartTotal = usePOSStore(state => state.getCartTotal);

  // React Query
  const { data: products = [], isLoading, error } = useProducts();
  const createSale = useCreateSale();

  const totals = getCartTotal();

  console.log(totals);

  const handleCompleteSale = async (paymentData: any) => {
    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        paymentMethod: paymentData.paymentMethod,
        customerName: paymentData.customerName,
        discount: totals.discount,
        tax: totals.tax,
      };

      await createSale.mutateAsync(saleData);
      setShowPaymentModal(false);

      // Show success message
      alert('Sale completed successfully!');
    } catch (error) {
      console.error('Sale failed:', error);
      alert('Failed to complete sale. Please try again.');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Side - Products */}
      <div className="flex-1 flex flex-col">
        {/* Search Bar */}
        <div className="bg-white p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name, SKU, or barcode..."
              className="w-full pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-red-600">Error loading products</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Cart */}
      <div className="w-96 bg-white border-l flex flex-col pb-20">
        {/* Cart Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-900">Current Sale</h2>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ShoppingCart className="w-4 h-4" />
            <span>{cart.length} items</span>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShoppingCart className="w-16 h-16 mb-2" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs">Add products to start a sale</p>
            </div>
          ) : (
            cart.map(item => (
              <CartItemCard
                key={item.id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
              />
            ))
          )}
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="border-t p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="font-semibold">{formatCurrency(totals.tax)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount</span>
              <span className="font-semibold text-red-600">
                -{formatCurrency(totals.discount)}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-bold text-lg">Total</span>
              <span className="font-bold text-xl text-blue-600">
                {formatCurrency(totals.total)}
              </span>
            </div>

            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={createSale.isPending}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
            >
              {createSale.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Proceed to Payment
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          total={totals.total}
          onClose={() => setShowPaymentModal(false)}
          onComplete={handleCompleteSale}
        />
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({ product, onAddToCart }: any) {
  return (
    <button
      onClick={() => onAddToCart(product)}
      disabled={product.currentStock === 0}
      className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow text-left border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex flex-col h-full">
        <div className="font-semibold text-gray-900 mb-1 line-clamp-2">
          {product.name}
        </div>
        <div className="text-sm text-gray-500 mb-2">
          SKU: {product.sku}
        </div>
        <div className="mt-auto">
          <div className="text-lg font-bold text-blue-600">
            {formatCurrency(product.sellingPrice)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {product.currentStock === 0 ? (
              <span className="text-red-600 font-medium">Out of Stock</span>
            ) : product.currentStock <= product.reorderLevel ? (
              <span className="text-orange-600 font-medium">
                Low: {product.currentStock} {product.unit}
              </span>
            ) : (
              <span>Stock: {product.currentStock} {product.unit}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// Cart Item Card Component
function CartItemCard({ item, onUpdateQuantity, onRemove }: any) {
  const handleQuantityChange = (newQty: number) => {
    if (newQty > item.currentStock) {
      alert(`Only ${item.currentStock} units available`);
      return;
    }
    onUpdateQuantity(item.productId, newQty);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
            {item.name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatCurrency(item.unitPrice)} / {item.unit}
          </p>
        </div>
        <button
          onClick={() => onRemove(item.productId)}
          className="text-red-500 hover:text-red-700 p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
          >
            <Minus className="w-4 text-gray-900 h-4" />
          </button>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0.0)}
            className="w-16 text-center text-gray-900 placeholder-gray-400 border border-gray-300 rounded px-2 py-1 text-sm"
            min="0.25"
            max={item.currentStock}
          />
          <button
            onClick={() => handleQuantityChange(item.quantity + 1)}
            className="w-7 h-7 rounded bg-gray-200 text-gray-900 hover:bg-gray-300 flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="font-bold text-gray-900">
          {formatCurrency(item.subtotal)}
        </div>
      </div>
    </div>
  );
}

// Payment Modal Component (same as before)
function PaymentModal({ total, onClose, onComplete }: any) {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE_MONEY'>('CASH');
  const [amountPaid, setAmountPaid] = useState(total.toString());
  const [customerName, setCustomerName] = useState('');

  const change = Math.max(0, parseFloat(amountPaid || '0') - total);
  const canComplete = parseFloat(amountPaid || '0') >= total;

  const handleComplete = () => {
    onComplete({
      paymentMethod,
      amountPaid: parseFloat(amountPaid),
      change,
      customerName: customerName || undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center text-gray-500 justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Payment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center py-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Amount Due</div>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(total)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'CASH', icon: Banknote, label: 'Cash' },
                { value: 'CARD', icon: CreditCard, label: 'Card' },
                { value: 'MOBILE_MONEY', icon: Smartphone, label: 'M-Pesa' },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setPaymentMethod(value as any)}
                  className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${paymentMethod === value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                    }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Paid
            </label>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.01"
              min={total}
            />
          </div>

          {change > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Change</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(change)}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name (Optional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter customer name"
            />
          </div>
        </div>

        <div className="p-6 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={!canComplete}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Receipt className="w-5 h-5" />
            Complete Sale
          </button>
        </div>
      </div>
    </div>
  );
}