
export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER';
export type MerchantPlan = 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';

export interface Merchant {
  id: string;
  slug: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  logoUrl: string;
  currency: string;
  timezone: string;
  plan: MerchantPlan;
  isActive: boolean;
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface PaymentRequest {
  id: String;
  merchantId: String;
  plan: MerchantPlan;
  transactionCode: String;
  status: PaymentStatus;
  notes?: String;
  createdAt: Date;
  updatedAt: Date;
  merchant: Merchant;
}


export interface User {
  id: string;
  merchantId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  plan?: MerchantPlan;
}

export interface SessionPayload {
  merchantId: string;
  userId: string;
  email: string;
  role: UserRole;
  expiresAt: Date;
  plan: MerchantPlan;
}

export interface Category {
  id: string;
  merchantId: string;
  name: string;
  description: string;
}


export interface Product {
  id: string;
  merchantId: string;
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
  merchantId: string;
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

// types/stock-adjustment.ts
export enum TransactionType {
  ADJUSTMENT_ADD = 'ADJUSTMENT_ADD',
  ADJUSTMENT_REMOVE = 'ADJUSTMENT_REMOVE',
  DAMAGE = 'DAMAGE',
  THEFT = 'THEFT',
  EXPIRY = 'EXPIRY',
  CORRECTION = 'CORRECTION',
  RETURN = 'RETURN',
  SAMPLE = 'SAMPLE'
}

export interface StockAdjustment {
  id: string;
  merchantId: string;
  productId: string;
  userId: string;
  type: TransactionType;
  quantity: number;
  reason: string;
  notes?: string;
  createdAt: Date;

  // Relationss
  product: Product;
  user: User;
}

export interface CreateAdjustmentDTO {
  productId: string;
  type: TransactionType;
  quantity: number;
  reason: string;
  notes?: string;
}

export interface AdjustmentFilters {
  productId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export interface StockCountReport {
  date: string;
  missingStock: number;
  excessStock: number;
  totalVariance: number;
}

export interface StockCount {
  id: string;
  merchantId: string;
  date: string;
  entries: StockCountEntry[];
  totalProducts: number;
  countedProducts: number;
  missingStock: number;
  excessStock: number;
  totalVariance: number;
  estimatedLoss: number;
  productsWithVariance: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockCountReport {
  id: string;
  date: string;
  productsCounted: number;
  missingStock: number;
  excessStock: number;
  totalVariance: number;
  estimatedLoss: number;
  productsWithVariance: number;
  accuracyRate: number;
  expectedStock?: number;
  actualStock?: number;
}

export interface ProductVarianceReport {
  productId: string;
  merchantId: string;
  productName: string;
  productSku: string;
  categoryId: string;
  categoryName: string;
  totalVariance: number;
  countOccurrences: number;
  averageVariance: number;
  estimatedRevenueLoss: number;
  lastCountDate: string;
}

export interface DailyStockSummary {
  date: string;
  merchantId: string;
  totalProducts: number;
  perfectMatches: number;
  missingStock: number;
  excessStock: number;
  totalVariance: number;
  estimatedLoss: number;
  accuracyRate: number;
}
