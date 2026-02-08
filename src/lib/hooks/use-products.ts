// lib/hooks/use-products.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInventoryStore } from '@/lib/stores/inventory-store';
import { Product } from '@/types';

// API functions
async function fetchProducts() {
  const response = await fetch('/api/inventory');
  if (!response.ok) throw new Error('Failed to fetch products');

  const data = await response.json();
  return data?.data;
}

async function fetchCategories() {
  const response = await fetch('/api/category');
  if (!response.ok) throw new Error('Failed to fetch categories');

  const data = await response.json();
  return data?.data;
}

async function fetchProductById(id: string) {
  const response = await fetch(`/api/inventory/${id}`);
  if (!response.ok) throw new Error('Failed to fetch product');
  return await response.json();
}

async function createProduct(data: any) {
  const response = await fetch('/api/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create product');
  return response.json();
}

async function updateProduct({ id, data }: { id: string; data: any }) {
  const response = await fetch(`/api/inventory/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update product');
  return response.json();
}

async function deleteProduct(id: string) {
  const response = await fetch(`/api/inventory/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete product');
  return response.json();
}

// React Query Hooks

/**
 * Fetch all products
 */
export function useProducts() {
  const setProducts = useInventoryStore(state => state.setProducts);
  const setLoading = useInventoryStore(state => state.setLoading);
  const setError = useInventoryStore(state => state.setError);

  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });
}


/**
 * Fetch all products
 */
export function useCategories() {
  const setCategories = useInventoryStore(state => state.setCategories);
  const setLoadingCategories = useInventoryStore(state => state.setLoadingCategories);
  const setError = useInventoryStore(state => state.setError);

  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });
}


/**
 * Fetch single product by ID
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product-by-id', id],
    queryFn: () => fetchProductById(id),
    enabled: !!id,
  });
}

/**
 * Create new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();
  const addProduct = useInventoryStore(state => state.addProduct);

  return useMutation({
    mutationFn: createProduct,
    onSuccess: (newProduct) => {
      // Invalidate and refetch products list
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Optimistically update store
      addProduct(newProduct);
    },
  });
}

/**
 * Update existing product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const updateProductInStore = useInventoryStore(state => state.updateProduct);

  return useMutation({
    mutationFn: updateProduct,
    onSuccess: (updatedProduct) => {
      // Update specific product in cache
      queryClient.setQueryData(
        ['products', updatedProduct.id],
        updatedProduct
      );
      // Invalidate products list
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Update store
      updateProductInStore(updatedProduct.id, updatedProduct);
    },
  });
}

/**
 * Delete product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const deleteProductFromStore = useInventoryStore(state => state.deleteProduct);

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['products', deletedId] });
      // Invalidate products list
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Update store
      deleteProductFromStore(deletedId);
    },
  });
}

/**
 * Search products (client-side filtering with React Query)
 */
export function useProductsSearch(searchQuery: string) {
  return useQuery({
    queryKey: ['products', 'search', searchQuery],
    queryFn: () => fetchProducts(),
    select: (data) => {
      if (!searchQuery) return data;

      return data.filter((product: any) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    },
  });
}

/**
 * Get low stock products
 */
export function useLowStockProducts() {
  return useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: () => fetchProducts(),
    select: (data) =>
      data.filter(
        (product: any) =>
          product.currentStock <= product.reorderLevel &&
          product.currentStock > 0
      ),
  });
}

/**
 * Get out of stock products
 */
export function useOutOfStockProducts() {
  return useQuery({
    queryKey: ['products', 'out-of-stock'],
    queryFn: () => fetchProducts(),
    select: (data) =>
      data.filter((product: any) => product.currentStock === 0),
  });
}