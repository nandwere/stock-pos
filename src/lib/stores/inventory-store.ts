// lib/stores/inventory-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

interface InventoryStore {
  // State
  products: Product[];
  categories: Category[];
  selectedCategory: string;
  searchQuery: string;
  stockFilter: 'all' | 'low' | 'out';
  isLoading: boolean;
  error: string | null;

  // Actions
  setProducts: (products: Product[]) => void;
  setCategories: (products: Category[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  setSelectedCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setStockFilter: (filter: 'all' | 'low' | 'out') => void;
  setLoading: (loading: boolean) => void;
  setLoadingCategories: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  getFilteredProducts: () => Product[];
  getLowStockCount: () => number;
  getOutOfStockCount: () => number;
  getTotalInventoryValue: () => number;
  getProductById: (id: string) => Product | undefined;
}

export const useInventoryStore = create<InventoryStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      products: [],
      categories: [],
      selectedCategory: 'all',
      searchQuery: '',
      stockFilter: 'all',
      isLoading: false,
      error: null,

      // Actions
      setProducts: (products) => set({ products }),

      setCategories: (categories) => set({ categories }),

      addProduct: (product) =>
        set(state => ({
          products: [...state.products, product]
        })),

      updateProduct: (id, updates) =>
        set(state => ({
          products: state.products.map(p =>
            p.id === id ? { ...p, ...updates } : p
          )
        })),

      deleteProduct: (id) =>
        set(state => ({
          products: state.products.filter(p => p.id !== id)
        })),

      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setStockFilter: (filter) => set({ stockFilter: filter }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // Computed getters
      getFilteredProducts: () => {
        const { products, searchQuery, selectedCategory, stockFilter } = get();

        return products.filter(product => {
          // Search filter
          const matchesSearch =
            searchQuery === '' ||
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());

          // Category filter
          const matchesCategory =
            selectedCategory === 'all' ||
            product.category === selectedCategory;

          // Stock filter
          const matchesStock =
            stockFilter === 'all' ||
            (stockFilter === 'low' && product.currentStock <= product.reorderLevel && product.currentStock > 0) ||
            (stockFilter === 'out' && product.currentStock === 0);

          return matchesSearch && matchesCategory && matchesStock;
        });
      },

      getLowStockCount: () => {
        const { products } = get();
        return products.filter(
          p => p.currentStock <= p.reorderLevel && p.currentStock > 0
        ).length;
      },

      getOutOfStockCount: () => {
        const { products } = get();
        return products.filter(p => p.currentStock === 0).length;
      },

      getTotalInventoryValue: () => {
        const { products } = get();
        return products.reduce(
          (sum, p) => sum + (p.currentStock * p.costPrice),
          0
        );
      },

      getProductById: (id) => {
        const { products } = get();
        return products.find(p => p.id === id);
      }
    }),
    { name: 'InventoryStore' }
  )
);