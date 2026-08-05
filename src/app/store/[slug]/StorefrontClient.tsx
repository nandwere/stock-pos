'use client';

import { useEffect, useMemo, useState } from 'react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  sellingPrice: number;
  currentStock: number;
  unit: string;
  categoryId: string;
  imageUrl: string | null;
}

// Below this many units, show a "Only N left" warning. Above it, the exact
// count isn't shown at all — most customers don't need to know there are
// "88 Kg left," only that there's plenty.
const LOW_STOCK_THRESHOLD = 5;

interface Category {
  id: string;
  name: string;
}

interface Store {
  name: string;
  logoUrl: string | null;
  currency: string;
  tagline: string | null;
  deliveryFee: number;
}

interface CartLine {
  productId: string;
  quantity: number;
}

function cartStorageKey(slug: string) {
  return `storefront-cart-${slug}`;
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
}

export function StorefrontClient({
  slug,
  store,
  categories,
  products,
}: {
  slug: string;
  store: Store;
  categories: Category[];
  products: Product[];
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'confirmed'>('cart');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState<string | null>(null);

  const [form, setForm] = useState({ customerName: '', customerPhone: '', deliveryAddress: '', deliveryNotes: '' });

  // Restore cart from localStorage on mount (per-store, so switching stores
  // in the same browser doesn't mix carts).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(cartStorageKey(slug));
      if (raw) setCart(JSON.parse(raw));
    } catch {
      // ignore corrupt/blocked storage — cart just starts empty
    }
  }, [slug]);

  useEffect(() => {
    try {
      localStorage.setItem(cartStorageKey(slug), JSON.stringify(cart));
    } catch {
      // storage may be unavailable (private browsing, quota) — non-fatal
    }
  }, [cart, slug]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeCategory && p.categoryId !== activeCategory) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, activeCategory, search]);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => {
    const product = productMap.get(line.productId);
    return product ? sum + product.sellingPrice * line.quantity : sum;
  }, 0);
  const total = subtotal + (cart.length > 0 ? store.deliveryFee : 0);

  function addToCart(productId: string) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      const product = productMap.get(productId);
      if (!product || product.currentStock <= 0) return prev;

      if (existing) {
        if (existing.quantity >= product.currentStock) return prev; // don't exceed stock
        return prev.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((l) => l.productId !== productId));
      return;
    }
    const product = productMap.get(productId);
    const clamped = product ? Math.min(quantity, product.currentStock) : quantity;
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity: clamped } : l)));
  }

  async function submitOrder() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/storefront/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not place order');

      setConfirmedOrderNumber(data.orderNumber);
      setCheckoutStep('confirmed');
      setCart([]);
      localStorage.removeItem(cartStorageKey(slug));
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logoUrl} alt={store.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                {store.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg leading-tight">{store.name}</h1>
              {store.tagline && <p className="text-sm text-gray-500">{store.tagline}</p>}
            </div>
          </div>

          <button
            onClick={() => {
              setCartOpen(true);
              setCheckoutStep('cart');
            }}
            className="relative bg-emerald-600 text-white px-4 py-2 rounded-full font-medium"
          >
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Search + categories ── */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full border rounded-lg px-4 py-2 mb-3"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap border ${
              activeCategory === null ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white'
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap border ${
                activeCategory === c.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product grid ── */}
      <div className="max-w-5xl mx-auto px-4 pb-24 grid grid-cols-2 md:grid-cols-3 gap-4">
        {filteredProducts.map((p) => {
          const inCart = cart.find((l) => l.productId === p.id);
          const outOfStock = p.currentStock <= 0;
          const lowStock = !outOfStock && p.currentStock <= LOW_STOCK_THRESHOLD;

          return (
            <div
              key={p.id}
              className={`bg-white border rounded-xl overflow-hidden flex flex-col ${outOfStock ? 'opacity-60' : ''}`}
            >
              <div className="aspect-square bg-gray-100 relative">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📦</div>
                )}
                {outOfStock && (
                  <span className="absolute top-2 left-2 bg-gray-900/80 text-white text-xs px-2 py-0.5 rounded-full">
                    Out of stock
                  </span>
                )}
              </div>

              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold">{p.name}</h3>
                {p.description && <p className="text-sm text-gray-500 line-clamp-2 mt-1">{p.description}</p>}
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <span className="font-bold">{formatMoney(p.sellingPrice, store.currency)} per kg</span>
                  {lowStock && (
                    <span className="text-xs text-amber-600 font-medium">
                      Only {p.currentStock} {p.unit} left
                    </span>
                  )}
                </div>

                {outOfStock ? (
                  <button disabled className="mt-2 bg-gray-200 text-gray-400 rounded-lg py-1.5 font-medium cursor-not-allowed">
                    Out of stock
                  </button>
                ) : inCart ? (
                  <div className="mt-2 flex items-center justify-between border rounded-lg">
                    <button
                      className="px-3 py-1 text-lg"
                      onClick={() => updateQuantity(p.id, inCart.quantity - 1)}
                    >
                      −
                    </button>
                    <span>{inCart.quantity}</span>
                    <button
                      className="px-3 py-1 text-lg"
                      onClick={() => updateQuantity(p.id, inCart.quantity + 1)}
                      disabled={inCart.quantity >= p.currentStock}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(p.id)}
                    className="mt-2 bg-emerald-600 text-white rounded-lg py-1.5 font-medium"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <p className="col-span-full text-center text-gray-400 py-12">No products found.</p>
        )}
      </div>

      {/* ── Cart / checkout drawer ── */}
      {cartOpen && (
        <div className="fixed inset-0 z-30 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white w-full max-w-md h-full overflow-y-auto p-5">
            {checkoutStep === 'cart' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Your Cart</h2>
                  <button onClick={() => setCartOpen(false)} className="text-gray-400 text-2xl leading-none">
                    ×
                  </button>
                </div>

                {cart.length === 0 && <p className="text-gray-400">Your cart is empty.</p>}

                {cart.map((line) => {
                  const product = productMap.get(line.productId);
                  if (!product) return null;
                  return (
                    <div key={line.productId} className="flex justify-between items-center py-3 border-b">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">📦</div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatMoney(product.sellingPrice, store.currency)} × {line.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(line.productId, line.quantity - 1)}>−</button>
                        <span>{line.quantity}</span>
                        <button
                          onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                          disabled={line.quantity >= product.currentStock}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}

                {cart.length > 0 && (
                  <>
                    <div className="mt-4 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatMoney(subtotal, store.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery fee</span>
                        <span>{formatMoney(store.deliveryFee, store.currency)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base pt-2 border-t">
                        <span>Total</span>
                        <span>{formatMoney(total, store.currency)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setCheckoutStep('details')}
                      className="mt-5 w-full bg-emerald-600 text-white rounded-lg py-3 font-semibold"
                    >
                      Proceed to checkout
                    </button>
                  </>
                )}
              </>
            )}

            {checkoutStep === 'details' && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setCheckoutStep('cart')} className="text-2xl leading-none">
                    ‹
                  </button>
                  <h2 className="text-xl font-bold">Delivery details</h2>
                </div>

                {error && <p className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-3">{error}</p>}

                <div className="space-y-3">
                  <input
                    placeholder="Full name"
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.customerName}
                    onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                  />
                  <input
                    placeholder="Phone number"
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.customerPhone}
                    onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
                  />
                  <textarea
                    placeholder="Delivery address"
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                    value={form.deliveryAddress}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
                  />
                  <textarea
                    placeholder="Notes for the rider (optional)"
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                    value={form.deliveryNotes}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryNotes: e.target.value }))}
                  />
                </div>

                <div className="mt-4 bg-amber-50 text-amber-800 text-sm rounded-lg p-3">
                  💵 Pay on delivery — you'll pay the rider cash, card, or mobile money when your order arrives.
                </div>

                <button
                  onClick={submitOrder}
                  disabled={submitting || !form.customerName || !form.customerPhone || !form.deliveryAddress}
                  className="mt-4 w-full bg-emerald-600 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Placing order…' : `Place order — ${formatMoney(total, store.currency)}`}
                </button>
              </>
            )}

            {checkoutStep === 'confirmed' && confirmedOrderNumber && (
              <div className="text-center py-10">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-xl font-bold mb-1">Order placed!</h2>
                <p className="text-gray-500 mb-4">Your order number is</p>
                <p className="text-2xl font-mono font-bold mb-6">{confirmedOrderNumber}</p>
                <p className="text-sm text-gray-500 mb-4">
                  Save this number and your phone number — you'll need both to check your order status.
                </p>
                <a
                  href={`/store/${slug}/order/${confirmedOrderNumber}`}
                  className="block w-full bg-emerald-600 text-white rounded-lg py-3 font-semibold mb-2"
                >
                  Track this order
                </a>
                <button onClick={() => setCartOpen(false)} className="w-full border rounded-lg py-3 font-semibold">
                  Continue shopping
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}