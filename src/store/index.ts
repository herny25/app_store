import { create } from 'zustand';
import { CartItem, Product, Sale, PaymentMethod } from '../types';
import * as DB from '../database/db';

// ─── Cart Store ───────────────────────────────────────────────

interface CartState {
  items: CartItem[];
  discount: number; // percentage 0-100
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  setDiscount: (pct: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  total: () => number;
  discountAmount: () => number;
  itemCount: () => number;
  checkout: (method: PaymentMethod, customerName?: string) => Sale;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,

  addItem: (product) => {
    set(state => {
      const existing = state.items.find(i => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map(i =>
            i.product.id === product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return { items: [...state.items, { product, quantity: 1 }] };
    });
  },

  removeItem: (productId) => {
    set(state => ({ items: state.items.filter(i => i.product.id !== productId) }));
  },

  updateQuantity: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    set(state => ({
      items: state.items.map(i =>
        i.product.id === productId ? { ...i, quantity: qty } : i
      ),
    }));
  },

  setDiscount: (pct) => set({ discount: Math.min(100, Math.max(0, pct)) }),
  clearCart: () => set({ items: [], discount: 0 }),

  subtotal: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
  discountAmount: () => get().subtotal() * (get().discount / 100),
  total: () => get().subtotal() - get().discountAmount(),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  checkout: (method, customerName) => {
    const { items, discount, subtotal, total, discountAmount, clearCart } = get();
    const saleId = `s${Date.now()}`;
    const now = new Date().toISOString();

    const saleItems = items.map((item, idx) => ({
      id: `${saleId}_${idx}`,
      saleId,
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price,
      subtotal: item.product.price * item.quantity,
    }));

    const sale: Sale = {
      id: saleId,
      saleNumber: 0,
      items: saleItems,
      subtotal: subtotal(),
      discount: discountAmount(),
      total: total(),
      paymentMethod: method,
      status: 'completed',
      customerName,
      createdAt: now,
    };

    DB.createSale(sale);
    clearCart();
    return DB.getSaleByInternalId(saleId) ?? sale;
  },
}));

// ─── Products Store ───────────────────────────────────────────

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  search: string;
  selectedCategory: string;
  load: () => void;
  setSearch: (q: string) => void;
  setCategory: (cat: string) => void;
  filtered: () => Product[];
  refresh: () => void;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  loading: true,
  error: null,
  search: '',
  selectedCategory: 'Todos',

  load: () => {
    try {
      const products = DB.getAllProducts();
      set({ products, loading: false, error: null });
    } catch (e) {
      set({ loading: false, error: 'No se pudieron cargar los productos' });
    }
  },

  refresh: () => {
    try {
      const products = DB.getAllProducts();
      set({ products, error: null });
    } catch (e) {
      set({ error: 'Error al actualizar productos' });
    }
  },

  setSearch: (q) => set({ search: q }),
  setCategory: (cat) => set({ selectedCategory: cat }),

  filtered: () => {
    const { products, search, selectedCategory } = get();
    return products.filter(p => {
      const matchCat = selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchSearch = search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  },
}));

// ─── Settings Store ───────────────────────────────────────────

interface SettingsState {
  storeName: string;
  ownerName: string;
  isSetup: boolean;
  load: () => void;
  save: (storeName: string, ownerName: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  storeName: '',
  ownerName: '',
  isSetup: false,

  load: () => {
    const storeName = DB.getSetting('storeName') ?? '';
    const ownerName = DB.getSetting('ownerName') ?? '';
    set({ storeName, ownerName, isSetup: !!(storeName && ownerName) });
  },

  save: (storeName, ownerName) => {
    DB.setSetting('storeName', storeName.trim());
    DB.setSetting('ownerName', ownerName.trim());
    set({ storeName: storeName.trim(), ownerName: ownerName.trim(), isSetup: true });
  },
}));

// ─── Dashboard Store ──────────────────────────────────────────

interface DashboardState {
  metrics: ReturnType<typeof DB.getDashboardMetrics> | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  metrics: null,
  loading: true,
  error: null,
  refresh: () => {
    try {
      const metrics = DB.getDashboardMetrics();
      set({ metrics, loading: false, error: null });
    } catch (e) {
      set({ loading: false, error: 'No se pudieron cargar las métricas' });
    }
  },
}));
