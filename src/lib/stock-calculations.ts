// lib/stock-calculations.ts

// import { Decimal } from '@prisma/client/runtime/library';

/**
 * Calculate sale totals
 */
export function calculateSaleTotals(items: Array<{
  quantity: number;
  unitPrice: number;
}>, taxRate: number = 0, discount: number = 0) {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);

  const tax = subtotal * taxRate;
  const total = subtotal + tax - discount;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    total: Number(total.toFixed(2))
  };
}

/**
 * Calculate stock variance and estimated unrecorded sales
 */
export interface StockVarianceData {
  productId: string;
  productName: string;
  openingStock: number;
  recordedSales: number;
  expectedStock: number; // opening - recordedSales
  actualStock: number;   // from physical count
  variance: number;      // actual - expected
  sellingPrice: number;
}

export function calculateStockVariance(
  openingStock: number,
  recordedSales: number,
  actualStock: number,
  sellingPrice: number
) {
  const expectedStock = openingStock - recordedSales;
  const variance = actualStock - expectedStock;
  
  // If variance is negative, it means stock is missing (likely unrecorded sales)
  const unrecordedUnits = variance < 0 ? Math.abs(variance) : 0;
  const estimatedRevenue = unrecordedUnits * sellingPrice;

  return {
    expectedStock,
    actualStock,
    variance,
    unrecordedUnits,
    estimatedRevenue: Number(estimatedRevenue.toFixed(2))
  };
}

/**
 * Calculate daily summary from stock counts
 */
export function calculateDailySummary(
  stockVariances: StockVarianceData[],
  recordedSalesTotal: number,
  recordedSalesCount: number
) {
  const totalUnrecordedRevenue = stockVariances.reduce((sum, item) => {
    if (item.variance < 0) {
      const unrecordedUnits = Math.abs(item.variance);
      return sum + (unrecordedUnits * item.sellingPrice);
    }
    return sum;
  }, 0);

  const totalEstimatedRevenue = recordedSalesTotal + totalUnrecordedRevenue;
  const estimatedUnrecordedSalesCount = stockVariances.filter(
    item => item.variance < 0
  ).length;

  return {
    recordedSales: Number(recordedSalesTotal.toFixed(2)),
    recordedSalesCount,
    unrecordedRevenue: Number(totalUnrecordedRevenue.toFixed(2)),
    estimatedUnrecordedSalesCount,
    totalEstimatedRevenue: Number(totalEstimatedRevenue.toFixed(2))
  };
}

/**
 * Generate sale number
 */
export function generateSaleNumber(date: Date = new Date()): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const time = Date.now().toString().slice(-6);
  
  return `SALE-${year}${month}${day}-${time}`;
}

/**
 * Calculate profit margin
 */
export function calculateProfitMargin(
  costPrice: number,
  sellingPrice: number
): {
  profit: number;
  profitMargin: number; // as percentage
  markup: number; // as percentage
} {
  const profit = sellingPrice - costPrice;
  const profitMargin = (profit / sellingPrice) * 100;
  const markup = (profit / costPrice) * 100;

  return {
    profit: Number(profit.toFixed(2)),
    profitMargin: Number(profitMargin.toFixed(2)),
    markup: Number(markup.toFixed(2))
  };
}

/**
 * Calculate inventory value
 */
export function calculateInventoryValue(products: Array<{
  currentStock: number;
  costPrice: number;
  sellingPrice: number;
}>) {
  const costValue = products.reduce((sum, p) => {
    return sum + (p.currentStock * p.costPrice);
  }, 0);

  const retailValue = products.reduce((sum, p) => {
    return sum + (p.currentStock * p.sellingPrice);
  }, 0);

  const potentialProfit = retailValue - costValue;

  return {
    costValue: Number(costValue.toFixed(2)),
    retailValue: Number(retailValue.toFixed(2)),
    potentialProfit: Number(potentialProfit.toFixed(2))
  };
}

/**
 * Check if product needs reorder
 */
export function needsReorder(
  currentStock: number,
  reorderLevel: number
): boolean {
  return currentStock <= reorderLevel;
}

/**
 * Calculate suggested reorder quantity
 * Uses simple EOQ (Economic Order Quantity) formula
 */
export function calculateReorderQuantity(
  averageDailySales: number,
  leadTimeDays: number,
  safetyStockDays: number = 7
): number {
  const leadTimeStock = averageDailySales * leadTimeDays;
  const safetyStock = averageDailySales * safetyStockDays;
  const reorderQuantity = leadTimeStock + safetyStock;
  
  return Math.ceil(reorderQuantity);
}

/**
 * Format currency
 */
export function formatCurrency(
  amount: number,
  currency: string = 'KES'
): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Calculate change due
 */
export function calculateChange(
  total: number,
  amountPaid: number
): number {
  const change = amountPaid - total;
  return Number(Math.max(0, change).toFixed(2));
}

/**
 * Validate stock availability
 */
export function validateStockAvailability(
  requestedQuantity: number,
  availableStock: number
): {
  isAvailable: boolean;
  message?: string;
} {
  if (requestedQuantity <= 0) {
    return {
      isAvailable: false,
      message: 'Quantity must be greater than zero'
    };
  }

  if (requestedQuantity > availableStock) {
    return {
      isAvailable: false,
      message: `Only ${availableStock} units available in stock`
    };
  }

  return { isAvailable: true };
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(
  currentValue: number,
  previousValue: number
): {
  change: number;
  percentageChange: number;
  isIncrease: boolean;
} {
  if (previousValue === 0) {
    return {
      change: currentValue,
      percentageChange: currentValue > 0 ? 100 : 0,
      isIncrease: currentValue > 0
    };
  }

  const change = currentValue - previousValue;
  const percentageChange = (change / previousValue) * 100;

  return {
    change: Number(change.toFixed(2)),
    percentageChange: Number(percentageChange.toFixed(2)),
    isIncrease: change >= 0
  };
}