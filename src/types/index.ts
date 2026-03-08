// ─── Domain Types ─────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  emoji: string;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer';
export type SaleStatus = 'completed' | 'refunded' | 'pending';

export interface Sale {
  id: string;
  saleNumber: number;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  customerName?: string;
  createdAt: string;
}

export interface InventoryAdjustment {
  id: string;
  productId: string;
  productName: string;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
}

// ─── Dashboard Types ───────────────────────────────────────────

export interface DashboardMetrics {
  todayRevenue: number;
  todayTransactions: number;
  todayItemsSold: number;
  averageBasket: number;
  revenueChange: number;
  weeklyData: { day: string; revenue: number }[];
  topProducts: { name: string; units: number; revenue: number; emoji: string }[];
  lowStockAlerts: Product[];
}

// ─── Stock Status ──────────────────────────────────────────────

export type StockStatus = 'ok' | 'low' | 'critical';

export function getStockStatus(product: Product): StockStatus {
  if (product.stock <= 0) return 'critical';
  if (product.stock <= product.minStock * 0.5) return 'critical';
  if (product.stock <= product.minStock) return 'low';
  return 'ok';
}

export const CATEGORIES = [
  'Todos',
  'Electrónica',
  'Bebidas',
  'Papelería',
  'Accesorios',
  'Alimentos',
  'Otro',
] as const;

export type Category = (typeof CATEGORIES)[number];
