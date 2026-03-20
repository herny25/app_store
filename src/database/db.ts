import * as SQLite from 'expo-sqlite';
import { Product, Sale, SaleItem, InventoryAdjustment } from '../types';

// ─── Open DB ──────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

export function getDB(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('retailflow.db');
  }
  return _db;
}

// ─── Migrations / Schema ──────────────────────────────────────

export function initDatabase(): void {
  const db = getDB();

  // Products table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS products (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'Otro',
      price       REAL NOT NULL DEFAULT 0,
      cost        REAL NOT NULL DEFAULT 0,
      stock       INTEGER NOT NULL DEFAULT 0,
      min_stock   INTEGER NOT NULL DEFAULT 10,
      emoji       TEXT NOT NULL DEFAULT '📦',
      barcode     TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `);

  // Sales table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sales (
      id              TEXT PRIMARY KEY,
      subtotal        REAL NOT NULL DEFAULT 0,
      discount        REAL NOT NULL DEFAULT 0,
      total           REAL NOT NULL DEFAULT 0,
      payment_method  TEXT NOT NULL DEFAULT 'cash',
      status          TEXT NOT NULL DEFAULT 'completed',
      customer_name   TEXT,
      created_at      TEXT NOT NULL
    );
  `);

  // Sale items table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id            TEXT PRIMARY KEY,
      sale_id       TEXT NOT NULL,
      product_id    TEXT NOT NULL,
      product_name  TEXT NOT NULL,
      quantity      INTEGER NOT NULL DEFAULT 1,
      unit_price    REAL NOT NULL DEFAULT 0,
      subtotal      REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    );
  `);

  // Inventory adjustments table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS inventory_adjustments (
      id              TEXT PRIMARY KEY,
      product_id      TEXT NOT NULL,
      product_name    TEXT NOT NULL,
      previous_stock  INTEGER NOT NULL,
      new_stock       INTEGER NOT NULL,
      reason          TEXT NOT NULL DEFAULT 'Manual adjustment',
      created_at      TEXT NOT NULL
    );
  `);

  // Settings table (key-value)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migración v1: elimina datos de demo si la BD no tiene versión asignada
  const version = db.getFirstSync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?', ['db_version']
  );
  if (!version) {
    db.withTransactionSync(() => {
      db.execSync('DELETE FROM inventory_adjustments');
      db.execSync('DELETE FROM sale_items');
      db.execSync('DELETE FROM sales');
      db.execSync('DELETE FROM products');
      db.runSync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['db_version', '1']
      );
    });
  }
}

// ─── Product CRUD ─────────────────────────────────────────────

export function getAllProducts(): Product[] {
  const db = getDB();
  const rows = db.getAllSync<any>('SELECT * FROM products ORDER BY name ASC');
  return rows.map(rowToProduct);
}

export function getProductById(id: string): Product | null {
  const db = getDB();
  const row = db.getFirstSync<any>('SELECT * FROM products WHERE id = ?', [id]);
  return row ? rowToProduct(row) : null;
}

export function searchProducts(query: string): Product[] {
  const db = getDB();
  const q = `%${query}%`;
  const rows = db.getAllSync<any>(
    'SELECT * FROM products WHERE name LIKE ? OR category LIKE ? ORDER BY name ASC',
    [q, q]
  );
  return rows.map(rowToProduct);
}

export function getProductsByCategory(category: string): Product[] {
  const db = getDB();
  if (category === 'Todos') return getAllProducts();
  const rows = db.getAllSync<any>(
    'SELECT * FROM products WHERE category = ? ORDER BY name ASC',
    [category]
  );
  return rows.map(rowToProduct);
}

export function createProduct(p: Omit<Product, 'createdAt' | 'updatedAt'>): void {
  const db = getDB();
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO products (id, name, category, price, cost, stock, min_stock, emoji, barcode, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.id, p.name, p.category, p.price, p.cost, p.stock, p.minStock, p.emoji, p.barcode ?? null, now, now]
  );
}

export function updateProduct(p: Partial<Product> & { id: string }): void {
  const db = getDB();
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: any[] = [];

  if (p.name !== undefined) { fields.push('name = ?'); values.push(p.name); }
  if (p.category !== undefined) { fields.push('category = ?'); values.push(p.category); }
  if (p.price !== undefined) { fields.push('price = ?'); values.push(p.price); }
  if (p.cost !== undefined) { fields.push('cost = ?'); values.push(p.cost); }
  if (p.stock !== undefined) { fields.push('stock = ?'); values.push(p.stock); }
  if (p.minStock !== undefined) { fields.push('min_stock = ?'); values.push(p.minStock); }
  if (p.emoji !== undefined) { fields.push('emoji = ?'); values.push(p.emoji); }
  if (p.barcode !== undefined) { fields.push('barcode = ?'); values.push(p.barcode); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(p.id);

  db.runSync(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
}

export function deleteProduct(id: string): void {
  const db = getDB();
  db.runSync('DELETE FROM products WHERE id = ?', [id]);
}

export function updateStock(productId: string, newStock: number, reason: string): void {
  const db = getDB();
  const product = getProductById(productId);
  if (!product) return;

  const adjId = `adj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.runSync(
    `INSERT INTO inventory_adjustments (id, product_id, product_name, previous_stock, new_stock, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [adjId, productId, product.name, product.stock, newStock, reason, new Date().toISOString()]
  );

  db.runSync('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', [
    newStock, new Date().toISOString(), productId,
  ]);
}

// ─── Sales ────────────────────────────────────────────────────

export function createSale(sale: Sale): void {
  const db = getDB();
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO sales (id, subtotal, discount, total, payment_method, status, customer_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sale.id, sale.subtotal, sale.discount, sale.total, sale.paymentMethod,
       sale.status, sale.customerName ?? null, sale.createdAt]
    );

    for (const item of sale.items) {
      db.runSync(
        `INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.saleId, item.productId, item.productName,
         item.quantity, item.unitPrice, item.subtotal]
      );
      // Decrement stock (no baja de 0)
      db.runSync(
        'UPDATE products SET stock = MAX(0, stock - ?), updated_at = ? WHERE id = ?',
        [item.quantity, new Date().toISOString(), item.productId]
      );
    }
  });
}

export function getSales(limit = 50, offset = 0): Sale[] {
  const db = getDB();
  const rows = db.getAllSync<any>(
    'SELECT rowid, * FROM sales ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return rows.map(r => rowToSale(r, db));
}

export function getSalesByDateRange(from: string, to: string): Sale[] {
  const db = getDB();
  const rows = db.getAllSync<any>(
    'SELECT rowid, * FROM sales WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC',
    [from, to]
  );
  return rows.map(r => rowToSale(r, db));
}

export function getSaleByInternalId(id: string): Sale | null {
  const db = getDB();
  const row = db.getFirstSync<any>('SELECT rowid, * FROM sales WHERE id = ?', [id]);
  return row ? rowToSale(row, db) : null;
}

export function refundSale(saleId: string): void {
  const db = getDB();
  const items = db.getAllSync<any>('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);
  for (const item of items) {
    db.runSync(
      'UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?',
      [item.quantity, new Date().toISOString(), item.product_id]
    );
  }
  db.runSync("UPDATE sales SET status = 'refunded' WHERE id = ?", [saleId]);
}

// ─── Dashboard Analytics ──────────────────────────────────────

export function getDashboardMetrics() {
  const db = getDB();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  const yesterdayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toISOString();
  const yesterdayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 59, 59).toISOString();

  // Today's revenue
  const todayStats = db.getFirstSync<any>(
    `SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as transactions
     FROM sales WHERE created_at >= ? AND created_at <= ? AND status != 'refunded'`,
    [todayStart, todayEnd]
  );

  // Yesterday's revenue
  const yesterdayStats = db.getFirstSync<any>(
    `SELECT COALESCE(SUM(total),0) as revenue FROM sales
     WHERE created_at >= ? AND created_at <= ? AND status != 'refunded'`,
    [yesterdayStart, yesterdayEnd]
  );

  // Items sold today
  const itemsSold = db.getFirstSync<any>(
    `SELECT COALESCE(SUM(si.quantity),0) as total
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     WHERE s.created_at >= ? AND s.created_at <= ? AND s.status != 'refunded'`,
    [todayStart, todayEnd]
  );

  // Weekly data (last 7 days)
  const weeklyData: { day: string; revenue: number }[] = [];
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
    const rev = db.getFirstSync<any>(
      `SELECT COALESCE(SUM(total),0) as revenue FROM sales
       WHERE created_at >= ? AND created_at <= ? AND status != 'refunded'`,
      [start, end]
    );
    weeklyData.push({ day: days[d.getDay()], revenue: rev?.revenue ?? 0 });
  }

  // Top 3 products (all time by revenue)
  const topProductRows = db.getAllSync<any>(
    `SELECT si.product_id, si.product_name,
       SUM(si.quantity) as units, SUM(si.subtotal) as revenue
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     WHERE s.status != 'refunded'
     GROUP BY si.product_id
     ORDER BY revenue DESC LIMIT 3`
  );

  const topProducts = topProductRows.map(r => {
    const p = getProductById(r.product_id);
    return { name: r.product_name, units: r.units, revenue: r.revenue, emoji: p?.emoji ?? '📦' };
  });

  // Weekly average basket (last 7 days)
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6).toISOString();
  const weekEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
  const weekStats = db.getFirstSync<any>(
    `SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as transactions
     FROM sales WHERE created_at >= ? AND created_at <= ? AND status != 'refunded'`,
    [weekStart, weekEnd]
  );
  const weeklyAverageBasket = weekStats?.transactions > 0
    ? weekStats.revenue / weekStats.transactions
    : 0;

  // Low stock alerts
  const lowStockRows = db.getAllSync<any>(
    'SELECT * FROM products WHERE stock <= min_stock ORDER BY stock ASC LIMIT 5'
  );

  const todayRevenue = todayStats?.revenue ?? 0;
  const yesterdayRevenue = yesterdayStats?.revenue ?? 0;
  const revenueChange = yesterdayRevenue > 0
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
    : 0;

  return {
    todayRevenue,
    todayTransactions: todayStats?.transactions ?? 0,
    todayItemsSold: itemsSold?.total ?? 0,
    averageBasket: todayStats?.transactions > 0 ? todayRevenue / todayStats.transactions : 0,
    weeklyAverageBasket,
    revenueChange,
    weeklyData,
    topProducts,
    lowStockAlerts: lowStockRows.map(rowToProduct),
  };
}

// ─── Row Mappers ──────────────────────────────────────────────

function rowToProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    cost: row.cost,
    stock: row.stock,
    minStock: row.min_stock,
    emoji: row.emoji,
    barcode: row.barcode ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSale(row: any, db: SQLite.SQLiteDatabase): Sale {
  const itemRows = db.getAllSync<any>(
    'SELECT * FROM sale_items WHERE sale_id = ?', [row.id]
  );
  const items: SaleItem[] = itemRows.map(i => ({
    id: i.id,
    saleId: i.sale_id,
    productId: i.product_id,
    productName: i.product_name,
    quantity: i.quantity,
    unitPrice: i.unit_price,
    subtotal: i.subtotal,
  }));
  return {
    id: row.id,
    saleNumber: row.rowid ?? 0,
    items,
    subtotal: row.subtotal,
    discount: row.discount,
    total: row.total,
    paymentMethod: row.payment_method,
    status: row.status,
    customerName: row.customer_name ?? undefined,
    createdAt: row.created_at,
  };
}

// ─── Settings ─────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const db = getDB();
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const db = getDB();
  db.runSync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

export function getInventoryAdjustments(): InventoryAdjustment[] {
  const db = getDB();
  const rows = db.getAllSync<any>(
    'SELECT * FROM inventory_adjustments ORDER BY created_at DESC LIMIT 50'
  );
  return rows.map(r => ({
    id: r.id,
    productId: r.product_id,
    productName: r.product_name,
    previousStock: r.previous_stock,
    newStock: r.new_stock,
    reason: r.reason,
    createdAt: r.created_at,
  }));
}
