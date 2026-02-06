// lib/stores/pos-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  sellingPrice: number;
  subtotal: number;
  currentStock: number;
  unit: string;
}

interface POSStore {
  cart: CartItem[];
  discount: number;
  tax: number;
  customerName: string;
  
  // Actions
  addToCart: (product: any) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setDiscount: (discount: number) => void;
  setTax: (tax: number) => void;
  setCustomerName: (name: string) => void;
  
  // Computed
  getCartTotal: () => {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  };
}

export const usePOSStore = create<POSStore>()(
  persist(
    (set, get) => ({
      cart: [],
      discount: 0,
      tax: 0,
      customerName: '',

      addToCart: (product) => {
        const { cart } = get();
        const existingItem = cart.find(item => item.productId === product.id);

        if (existingItem) {
          // Update quantity
          set({
            cart: cart.map(item =>
              item.productId === product.id
                ? {
                    ...item,
                    quantity: item.quantity + 1,
                    subtotal: (item.quantity + 1) * item.unitPrice
                  }
                : item
            )
          });
        } else {
          // Add new item
          set({
            cart: [
              ...cart,
              {
                id: `cart-${Date.now()}`,
                productId: product.id,
                name: product.name,
                sku: product.sku,
                quantity: 1,
                unitPrice: product.sellingPrice,
                sellingPrice: product.sellingPrice,
                subtotal: product.sellingPrice,
                currentStock: product.currentStock,
                unit: product.unit
              }
            ]
          });
        }
      },

      removeFromCart: (productId) => {
        set(state => ({
          cart: state.cart.filter(item => item.productId !== productId)
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }

        set(state => ({
          cart: state.cart.map(item =>
            item.productId === productId
              ? {
                  ...item,
                  quantity,
                  subtotal: quantity * item.unitPrice
                }
              : item
          )
        }));
      },

      clearCart: () => {
        set({
          cart: [],
          discount: 0,
          tax: 0,
          customerName: ''
        });
      },

      setDiscount: (discount) => set({ discount }),
      setTax: (tax) => set({ tax }),
      setCustomerName: (customerName) => set({ customerName }),

      getCartTotal: () => {
        const { cart, discount, tax } = get();
        
        const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
        const taxAmount = subtotal * (tax / 100);
        const total = subtotal + taxAmount - discount;

        return {
          subtotal,
          tax: taxAmount,
          discount,
          total: Math.max(0, total)
        };
      }
    }),
    {
      name: 'pos-storage',
      partialize: (state) => ({
        // Only persist cart and customer name
        cart: state.cart,
        customerName: state.customerName
      })
    }
  )
);