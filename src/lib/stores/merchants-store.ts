// lib/stores/inventory-store.ts
import { Merchant } from '@/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';


interface InventoryStore {
    // State
    merchants: Merchant[];
    searchQuery: string;
    stockFilter: 'all' | 'low' | 'out';
    isLoading: boolean;
    error: string | null;

    // Actions
    setMerchants: (merchants: Merchant[]) => void;
    addMerchant: (merchant: Merchant) => void;
    updateMerchant: (id: string, updates: Partial<Merchant>) => void;
    deleteMerchant: (id: string) => void;
    setSearchQuery: (query: string) => void;
    setStockFilter: (filter: 'all' | 'low' | 'out') => void;
    setLoading: (loading: boolean) => void;
    setLoadingCategories: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Computed
    getFilteredMerchants: () => Merchant[];
    getLowStockCount: () => number;
    getOutOfStockCount: () => number;
    getTotalInventoryValue: () => number;
    getMerchantById: (id: string) => Merchant | undefined;
}

export const useMerchantStore = create<InventoryStore>()(
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
            setMerchants: (merchants) => set({ merchants }),

            addMerchant: (merchant) =>
                set(state => ({
                    merchants: [...state.merchants, merchant]
                })),

            updateMerchant: (id, updates) =>
                set(state => ({
                    merchants: state.merchants.map(m =>
                        m.id === id ? { ...m, ...updates } : m
                    )
                })),

            deleteMerchant: (id) =>
                set(state => ({
                    merchants: state.merchants.filter(m => m.id !== id)
                })),

            setSearchQuery: (query) => set({ searchQuery: query }),
            setStockFilter: (filter) => set({ stockFilter: filter }),
            setLoading: (loading) => set({ isLoading: loading }),
            setError: (error) => set({ error }),

            // Computed getters
            getFilteredMerchants: () => {
                const { merchants, searchQuery, stockFilter } = get();

                return merchants.filter(merchant => {
                    // Search filter
                    const matchesSearch =
                        searchQuery === '' ||
                        merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        merchant.email.toLowerCase().includes(searchQuery.toLowerCase());

                    // Stock filter

                    return matchesSearch;
                });
            },

            getMerchantById: (id) => {
                const { merchants } = get();
                return merchants.find(m => m.id === id);
            }
        }),
        { name: 'MerchantStore' }
    )
);