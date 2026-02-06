
export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  expiresAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}


export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  category: Category;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  isActive: boolean;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId?: string;
  quantity?: string;
  unitPrice: string;
  subtotal: number;
  sale: Sale
  product: Product
}

export interface Sale {
  id: string;
  saleNumber: string;
  customerName?: string;
  paymentMethod?: string;
  subtotal: string;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  change: string;
  notes: boolean;
  items: SaleItem[]
  createdAt: Date
  user: User
}

export interface StockCountEntry {
  productId: string;
  product: Product;
  openingStock: number;
  recordedSales: number;
  expectedStock: number;
  actualStock: number | null;
  variance: number | null;
  estimatedRevenue: number | null;
  notes: string;
}