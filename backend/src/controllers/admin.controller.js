import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { query } from '../config/db.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, '../../backups');

async function ensureSettingsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

export async function getAdminSettings(req, res, next) {
  try {
    await ensureSettingsTable();
    const result = await query('SELECT setting_key, setting_value FROM settings ORDER BY setting_key ASC');
    const settings = Object.fromEntries(result.rows.map((row) => [row.setting_key, row.setting_value]));

    res.json({
      success: true,
      data: {
        settings,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminSettings(req, res, next) {
  try {
    await ensureSettingsTable();

    const payload = req.body?.settings || req.body || {};

    const settingFields = [
      ['cafeteriaName', 'cafeteria_name'],
      ['currency', 'currency'],
      ['timezone', 'timezone'],
      ['operatingHours', 'operating_hours'],
      ['orderNotifications', 'order_notifications'],
      ['stockAlerts', 'stock_alerts'],
      ['dailyReports', 'daily_reports'],
      ['backupFrequency', 'backup_frequency'],
    ];

    const normalizedValue = (value) => {
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (value === null || value === undefined) return null;
      return String(value);
    };

    const updates = [];

    for (const [fieldName, settingKey] of settingFields) {
      const rawValue = payload[fieldName] ?? payload[settingKey];
      if (rawValue === undefined) continue;
      const settingValue = normalizedValue(rawValue);
      if (settingValue === null) continue;
      updates.push({ key: settingKey, value: settingValue });
    }

    if (updates.length > 0) {
      const queries = updates.map(({ key, value }) => {
        console.log('[admin settings] upserting', { key, value });
        return query(
          `INSERT INTO settings (setting_key, setting_value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
          [key, value]
        );
      });

      await Promise.all(queries);
      console.log('[admin settings] upsert completed', updates);
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: { updated: updates.map((item) => ({ key: item.key, value: item.value })) },
    });
  } catch (err) {
    console.error('[admin settings] failed to update settings', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to save settings',
      error: err.message || 'Unknown error',
    });
  }
}

export async function createBackup(req, res, next) {
  try {
    await fs.mkdir(BACKUPS_DIR, { recursive: true });


    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.json`;
    const filePath = path.join(BACKUPS_DIR, fileName);

    const tables = [
      { name: 'orders', query: 'SELECT * FROM orders ORDER BY created_at ASC' },
      { name: 'users', query: 'SELECT id, name, email, role, student_id, is_active, created_at FROM users ORDER BY created_at ASC' },
      { name: 'menu_items', query: 'SELECT * FROM menu_items ORDER BY id ASC' },
      { name: 'inventory', query: 'SELECT * FROM inventory ORDER BY id ASC' },
      { name: 'shifts', query: 'SELECT * FROM shifts ORDER BY opened_at ASC' },
    ];

    const exportData = {};
    for (const table of tables) {
      const result = await query(table.query);
      exportData[table.name] = result.rows;
    }

    await fs.writeFile(filePath, JSON.stringify({ generatedAt: new Date().toISOString(), tables: exportData }, null, 2));

    res.status(201).json({
      success: true,
      message: 'Backup created successfully',
      data: {
        fileName,
        timestamp: new Date().toISOString(),
        path: filePath,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listBackups(req, res, next) {
  try {
    await fs.mkdir(BACKUPS_DIR, { recursive: true });

    const entries = await fs.readdir(BACKUPS_DIR, { withFileTypes: true });
    const backupFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith('.json'))
      .map((e) => ({
        filename: e.name,
      }));

    // Attempt to parse timestamp from filename: backup-<iso>.json
    const normalized = backupFiles
      .map((b) => {
        const match = b.filename.match(/^backup-(.+)\.json$/);
        const rawTs = match?.[1];
        let timestamp = null;

        if (rawTs) {
          const normalizedTs = rawTs.replace(/-/g, ':').replace(/T/, 'T');
          const parsed = new Date(normalizedTs);
          if (!Number.isNaN(parsed.getTime())) {
            timestamp = parsed.toISOString();
          }
        }

        return {
          id: b.filename,
          filename: b.filename,
          timestamp,
        };
      })
      .sort((a, b) => String(b.filename).localeCompare(String(a.filename)));

    res.json({ success: true, data: { backups: normalized } });
  } catch (err) {
    next(err);
  }
}

const restoreLock = { running: false };

export async function restoreBackup(req, res, next) {
  const { backupId } = req.params;

  try {
    if (restoreLock.running) {
      return res.status(409).json({ success: false, message: 'Restore already in progress' });
    }

    const normalizedBackupId = String(backupId || '').trim();
    if (!normalizedBackupId) {
      return res.status(400).json({ success: false, message: 'backupId is required' });
    }

    // Only allow filenames within backups dir.
    if (normalizedBackupId.includes('..') || normalizedBackupId.includes('/') || normalizedBackupId.includes('\\')) {
      return res.status(400).json({ success: false, message: 'Invalid backupId' });
    }

    await fs.mkdir(BACKUPS_DIR, { recursive: true });

    const fullPath = path.join(BACKUPS_DIR, normalizedBackupId);

    let raw;
    try {
      raw = await fs.readFile(fullPath, 'utf8');
    } catch {
      return res.status(404).json({ success: false, message: 'Backup file not found' });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(400).json({ success: false, message: 'Backup file is not valid JSON' });
    }

    const tables = parsed?.tables;
    const requiredTables = ['orders', 'users', 'menu_items', 'inventory', 'shifts'];
    const hasAll = requiredTables.every((t) => Array.isArray(tables?.[t]));
    if (!hasAll) {
      return res.status(400).json({
        success: false,
        message: 'Backup JSON does not match expected schema (missing tables arrays)',
      });
    }

    restoreLock.running = true;

    await query('BEGIN');
    try {
      // Delete current data for only the backed up tables.
      await query('DELETE FROM order_items');
      await query('DELETE FROM orders');

      await query('DELETE FROM meal_plans');
      await query('DELETE FROM users');

      await query('DELETE FROM menu_item_ingredients');
      await query('DELETE FROM menu_items');

      await query('DELETE FROM inventory');

      await query('DELETE FROM shifts');

      // Insert backed up rows.
      // Keep it simple: assume backup rows match table columns.
      for (const row of tables.orders) {
        const cols = Object.keys(row);
        const vals = cols.map((c) => row[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
        await query(
          `INSERT INTO orders (${cols.join(',')}) VALUES (${placeholders})`,
          vals
        );
      }

      for (const row of tables.users) {
        const cols = Object.keys(row);
        const vals = cols.map((c) => row[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
        await query(
          `INSERT INTO users (${cols.join(',')}) VALUES (${placeholders})`,
          vals
        );
      }

      for (const row of tables.menu_items) {
        const cols = Object.keys(row);
        const vals = cols.map((c) => row[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
        await query(
          `INSERT INTO menu_items (${cols.join(',')}) VALUES (${placeholders})`,
          vals
        );
      }

      for (const row of tables.inventory) {
        const cols = Object.keys(row);
        const vals = cols.map((c) => row[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
        await query(
          `INSERT INTO inventory (${cols.join(',')}) VALUES (${placeholders})`,
          vals
        );
      }

      for (const row of tables.shifts) {
        const cols = Object.keys(row);
        const vals = cols.map((c) => row[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
        await query(
          `INSERT INTO shifts (${cols.join(',')}) VALUES (${placeholders})`,
          vals
        );
      }

      await query('COMMIT');
    } catch (dbErr) {
      await query('ROLLBACK');
      throw dbErr;
    }

    return res.json({ success: true, message: 'Restore completed successfully' });
  } catch (err) {
    next(err);
  } finally {
    restoreLock.running = false;
  }
}

export async function changeAdminPassword(req, res, next) {
  const { currentPassword, newPassword } = req.body;


  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const result = await query('SELECT id, password_hash FROM users WHERE id = $1', [req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }

    const user = result.rows[0];
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.userId]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}

// --- MENU CRUD ---
function normalizeNutritionalInfo(nutritionalInfo = {}) {
  const normalized = {};
  if (typeof nutritionalInfo.calories !== 'undefined') {
    normalized.calories = nutritionalInfo.calories;
  }
  normalized.protein_g = nutritionalInfo.protein_g ?? nutritionalInfo.protein ?? 0;
  normalized.carbs_g = nutritionalInfo.carbs_g ?? nutritionalInfo.carbohydrates ?? nutritionalInfo.carbs ?? 0;
  normalized.fat_g = nutritionalInfo.fat_g ?? nutritionalInfo.fat ?? 0;
  return normalized;
}

export async function createMenuItem(req, res, next) {
  const { name, categoryId, price, imageUrl, allergens, dietaryTags, nutritionalInfo, modifiers, prepTimeMinutes } = req.body;
  const normalizedNutrition = normalizeNutritionalInfo(nutritionalInfo);
  try {
    const result = await query(
      `INSERT INTO menu_items (category_id, name, price, image_url, allergens, dietary_tags, nutritional_info, modifiers, prep_time_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [categoryId, name, price, imageUrl, allergens || [], dietaryTags || [], normalizedNutrition, modifiers || [], prepTimeMinutes ?? 5]
    );
    res.status(201).json({ success: true, data: { item: result.rows[0] } });
  } catch (err) {
    next(err);
  }
}

export async function updateMenuItem(req, res, next) {
  const { id } = req.params;
  const { name, categoryId, price, imageUrl, allergens, dietaryTags, nutritionalInfo, modifiers, prepTimeMinutes } = req.body;
  const normalizedNutrition = normalizeNutritionalInfo(nutritionalInfo);
  try {
    // Audit log price changes
    const oldItemResult = await query('SELECT price FROM menu_items WHERE id = $1', [id]);
    
    const result = await query(
      `UPDATE menu_items
       SET category_id = $1, name = $2, price = $3, image_url = $4, allergens = $5, dietary_tags = $6, nutritional_info = $7, modifiers = $8, prep_time_minutes = $9
       WHERE id = $10 RETURNING *`,
      [categoryId, name, price, imageUrl, allergens || [], dietaryTags || [], normalizedNutrition, modifiers || [], prepTimeMinutes ?? 5, id]
    );

    if (oldItemResult.rows.length > 0 && result.rows.length > 0) {
      const oldPrice = parseFloat(oldItemResult.rows[0].price);
      const newPrice = parseFloat(price);
      if (oldPrice !== newPrice) {
        await query(
          `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data, reason)
           VALUES ($1, 'PRICE_CHANGE', 'menu_items', $2, $3, $4, 'Menu item price updated by admin')`,
          [req.user.userId, id, JSON.stringify({ price: oldPrice }), JSON.stringify({ price: newPrice })]
        );
      }
    }

    res.json({ success: true, data: { item: result.rows[0] } });
  } catch (err) {
    next(err);
  }
}

export async function deleteMenuItem(req, res, next) {
  const { id } = req.params;
  try {
    const result = await query(`UPDATE menu_items SET is_active = false WHERE id = $1 RETURNING *`, [id]);
    await query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.userId, 'DELETE', 'menu_items', id, 'Soft deleted menu item']
    );
    res.json({ success: true, message: 'Item soft deleted successfully', data: { item: result.rows[0] } });
  } catch (err) {
    next(err);
  }
}

export async function toggleAvailability(req, res, next) {
  const { id } = req.params;
  const { isAvailable } = req.body;
  try {
    const result = await query(`UPDATE menu_items SET is_available = $1 WHERE id = $2 RETURNING *`, [isAvailable, id]);
    res.json({ success: true, data: { item: result.rows[0] } });
  } catch (err) {
    next(err);
  }
}

export async function toggleDailySpecial(req, res, next) {
  const { id } = req.params;
  const { isDailySpecial } = req.body;
  try {
    const result = await query(`UPDATE menu_items SET is_daily_special = $1 WHERE id = $2 RETURNING *`, [isDailySpecial, id]);
    res.json({ success: true, data: { item: result.rows[0] } });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  const { name, icon, displayOrder } = req.body;
  try {
    const result = await query(
      `INSERT INTO categories (name, icon, display_order) VALUES ($1, $2, $3) RETURNING *`,
      [name, icon, displayOrder || 0]
    );
    res.status(201).json({ success: true, data: { category: result.rows[0] } });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req, res, next) {
  const { id } = req.params;
  const { name, icon, displayOrder } = req.body;
  try {
    const result = await query(
      `UPDATE categories SET name = $1, icon = $2, display_order = $3 WHERE id = $4 RETURNING *`,
      [name, icon, displayOrder || 0, id]
    );
    res.json({ success: true, data: { category: result.rows[0] } });
  } catch (err) {
    next(err);
  }
}

// --- BARCODE MANAGEMENT ---

// GET /api/admin/menu-items/barcodes
// Returns all active menu items with their barcode + price, for the
// admin Barcode Management page and the printable sheet.
export async function listMenuItemBarcodes(req, res, next) {
  try {
    const result = await query(
      `SELECT id, name, price, barcode, category_id
       FROM menu_items
       WHERE is_active = true
       ORDER BY name ASC`
    );
    res.json({ success: true, data: { items: result.rows } });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/menu-items/:id/barcode/regenerate
// Generates a fresh unique barcode for a single item (e.g. if a barcode
// gets damaged/duplicated, or the item never had one).
export async function regenerateMenuItemBarcode(req, res, next) {
  const { id } = req.params;
  try {
    // Generate short unique barcode using timestamp + random number
    // Result: QB + 6 digit timestamp + 3 digit random = 11 chars total
    // Example: QB7234891042
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
                       .toString()
                       .padStart(3, '0');
    const newBarcode = `QB${timestamp}${random}`;

    const result = await query(
      `UPDATE menu_items 
       SET barcode = $1 
       WHERE id = $2 AND is_active = true
       RETURNING id, name, barcode`,
      [newBarcode, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Menu item not found' 
      });
    }

    res.json({ success: true, data: { item: result.rows[0] } });
  } catch (err) {
    next(err);
  }
}

// --- INVENTORY ---
export async function listInventory(req, res, next) {
  try {
    const result = await query(`SELECT * FROM inventory ORDER BY ingredient_name ASC`);
    res.json({ success: true, data: { inventory: result.rows } });
  } catch (err) {
    next(err);
  }
}

export async function updateInventory(req, res, next) {
  const { id } = req.params;
  const { currentStock, lowStockThreshold, unit } = req.body;
  try {
    const result = await query(
      `UPDATE inventory SET current_stock = $1, low_stock_threshold = $2, unit = $3, last_updated = NOW() WHERE id = $4 RETURNING *`,
      [currentStock, lowStockThreshold, unit, id]
    );
    res.json({ success: true, data: { inventory: result.rows[0] } });
  } catch (err) {
    next(err);
  }
}

export async function bulkUpdateInventory(req, res, next) {
  const { ingredients } = req.body;
  try {
    for (const item of ingredients) {
      const existing = await query(`SELECT id FROM inventory WHERE LOWER(ingredient_name) = LOWER($1)`, [item.ingredient_name]);
      if (existing.rows.length > 0) {
        await query(
          `UPDATE inventory SET current_stock = $1, unit = $2, low_stock_threshold = $3, last_updated = NOW() WHERE id = $4`,
          [item.current_stock, item.unit, item.low_stock_threshold, existing.rows[0].id]
        );
      } else {
        await query(
          `INSERT INTO inventory (ingredient_name, current_stock, unit, low_stock_threshold) VALUES ($1, $2, $3, $4)`,
          [item.ingredient_name, item.current_stock, item.unit, item.low_stock_threshold]
        );
      }
    }
    res.json({ success: true, message: 'Bulk inventory update complete' });
  } catch (err) {
    next(err);
  }
}

export async function getInventoryAlerts(req, res, next) {
  try {
    // "Low" means current_stock <= low_stock_threshold (matches InventoryManagement.jsx).
    const result = await query(`
      SELECT *
      FROM inventory
      WHERE current_stock <= low_stock_threshold
      ORDER BY ingredient_name ASC
    `);

    result.rows.forEach((item) => {
      console.log(
        `[SIMULATED EMAIL ALERT] Inventory Alert: Ingredient "${item.ingredient_name}" is low! Current stock: ${item.current_stock} ${item.unit} (Threshold: ${item.low_stock_threshold} ${item.unit})`,
      );
    });

    // DashboardOverview expects: { alerts: [...] }
    // InventoryManagement uses the same inequality via getStatus.
    res.json({ success: true, data: { alerts: result.rows } });
  } catch (err) {
    next(err);
  }
}


// --- REPORTS ---
function parseDateParam(value, endOfDay = false) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function getSalesReport(req, res, next) {
  const { from, to } = req.query;
  const fromDate = parseDateParam(from) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = parseDateParam(to, true) || new Date();
  try {
    const summaryResult = await query(
      `SELECT COUNT(*) as total_orders,
              COALESCE(SUM(total_amount), 0) as total_revenue,
              COALESCE(AVG(total_amount), 0) as avg_order_value
       FROM orders
       WHERE created_at >= $1 AND created_at <= $2 AND status != 'cancelled'`,
      [fromDate, toDate]
    );

    const categoryResult = await query(
      `SELECT c.name as category_name, COALESCE(SUM(oi.subtotal), 0) as revenue
       FROM order_items oi
       JOIN menu_items mi ON oi.menu_item_id = mi.id
       JOIN categories c ON mi.category_id = c.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.created_at >= $1 AND o.created_at <= $2 AND o.status != 'cancelled'
       GROUP BY c.name`,
      [fromDate, toDate]
    );

    const paymentResult = await query(
      `SELECT payment_method, COALESCE(SUM(total_amount), 0) as revenue
       FROM orders
       WHERE created_at >= $1 AND created_at <= $2 AND status != 'cancelled'
       GROUP BY payment_method`,
      [fromDate, toDate]
    );

    const hourlyResult = await query(
      `SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Karachi') as hour,
              COUNT(*) as orders_count,
              COALESCE(SUM(total_amount), 0) as revenue
       FROM orders
       WHERE created_at >= $1 AND created_at <= $2 AND status != 'cancelled'
       GROUP BY hour
       ORDER BY hour ASC`,
      [fromDate, toDate]
    );

    const dailyResult = await query(
      `SELECT DATE(created_at) as date,
              COUNT(*) as orders_count,
              COALESCE(SUM(total_amount), 0) as revenue
       FROM orders
       WHERE created_at >= $1 AND created_at <= $2 AND status != 'cancelled'
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [fromDate, toDate]
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders: parseInt(summaryResult.rows[0].total_orders, 10),
          totalRevenue: parseFloat(summaryResult.rows[0].total_revenue),
          avgOrderValue: parseFloat(summaryResult.rows[0].avg_order_value),
        },
        byCategory: categoryResult.rows.map(r => ({ category: r.category_name, revenue: parseFloat(r.revenue) })),
        byPayment: paymentResult.rows.map(r => ({ method: r.payment_method, revenue: parseFloat(r.revenue) })),
        hourly: hourlyResult.rows.map(r => ({ hour: parseInt(r.hour, 10), orders: parseInt(r.orders_count, 10), revenue: parseFloat(r.revenue) })),
        daily: dailyResult.rows.map(r => ({ date: new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }), orders: parseInt(r.orders_count, 10), revenue: parseFloat(r.revenue) })),
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getTopItemsReport(req, res, next) {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
  try {
    // Join order_items -> menu_items and aggregate quantities sold per menu item.
    // This ensures we use the canonical menu item name rather than relying on `order_items.item_name`.
    const result = await query(
      `SELECT mi.name as name,
              SUM(oi.quantity) as quantity_sold,
              COALESCE(SUM(oi.subtotal), 0) as revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE o.status != 'cancelled'
       GROUP BY mi.name
       ORDER BY quantity_sold DESC, revenue DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      data: {
        items: result.rows.map((r) => ({
          name: r.name,
          quantitySold: parseInt(r.quantity_sold, 10),
          revenue: parseFloat(r.revenue),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}


export async function getStaffReport(req, res, next) {
  try {
    const result = await query(
      `SELECT u.name as cashier_name,
              COUNT(o.id) as orders_processed,
              COALESCE(SUM(o.total_amount), 0) as total_revenue
       FROM orders o
       JOIN users u ON o.cashier_id = u.id
       WHERE o.status != 'cancelled'
       GROUP BY u.name`
    );

    const shiftResult = await query(
      `SELECT s.id, u.name as cashier_name, s.opened_at, s.closed_at, s.opening_cash, s.closing_cash, s.total_sales, s.status
       FROM shifts s
       JOIN users u ON s.cashier_id = u.id
       ORDER BY s.opened_at DESC`
    );

    res.json({
      success: true,
      data: {
        staff: result.rows.map(r => ({ cashierName: r.cashier_name, ordersProcessed: parseInt(r.orders_processed, 10), totalRevenue: parseFloat(r.total_revenue) })),
        shifts: shiftResult.rows.map(r => ({
          id: r.id,
          cashierName: r.cashier_name,
          openedAt: r.opened_at,
          closedAt: r.closed_at,
          openingCash: parseFloat(r.opening_cash),
          closingCash: r.closing_cash ? parseFloat(r.closing_cash) : null,
          totalSales: parseFloat(r.total_sales),
          status: r.status,
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

// --- STAFF MANAGEMENT ---
export async function listStaff(req, res, next) {
  try {
    const result = await query(`SELECT id, name, email, role, is_active, created_at FROM users ORDER BY role ASC, name ASC`);
    res.json({ success: true, data: { staff: result.rows } });
  } catch (err) {
    next(err);
  }
}

export async function createStaff(req, res, next) {
  const { name, email, role, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, is_active, created_at`,
      [name, email, hash, role]
    );
    const newStaffRow = result.rows[0];
    const io = req.app.get('io');
    if (io) {
      io.emit('staff:created', newStaffRow);
    }
    res.status(201).json({ success: true, data: { staff: newStaffRow } });
  } catch (err) {
    next(err);
  }
}

export async function toggleStaffStatus(req, res, next) {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    const result = await query(`UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, email, is_active`, [isActive, id]);
    const updatedStaff = result.rows[0];
    const io = req.app.get('io');
    if (io) {
      io.emit('staff:status_changed', { id: updatedStaff.id, isActive: updatedStaff.is_active });
    }
    res.json({ success: true, data: { staff: updatedStaff } });
  } catch (err) {
    next(err);
  }
}

export async function getStaffShifts(req, res, next) {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT * FROM shifts WHERE cashier_id = $1 ORDER BY opened_at DESC`,
      [id]
    );
    res.json({ success: true, data: { shifts: result.rows } });
  } catch (err) {
    next(err);
  }
}

// --- MEAL PLAN MANAGEMENT ---
export async function searchStudents(req, res, next) {
  const search = req.query.search || '';
  try {
    const result = await query(
      `SELECT DISTINCT ON (u.id) u.id, u.name, u.email, u.student_id,
              mp.plan_type, mp.total_credits, mp.used_credits, mp.remaining_credits, mp.expires_at
       FROM users u
       LEFT JOIN meal_plans mp ON mp.student_id = u.id
       WHERE u.role = 'student' AND (u.name ILIKE $1 OR u.student_id ILIKE $1 OR u.email ILIKE $1)
       ORDER BY u.id, mp.expires_at DESC NULLS LAST`,
      [`%${search}%`]
    );
    res.json({ success: true, data: { students: result.rows } });
  } catch (err) {
    next(err);
  }
}

export async function updateStudentMealPlan(req, res, next) {
  const { id } = req.params;
  const { planType, totalCredits, expiresAt } = req.body;
  try {
    const existing = await query(`SELECT id FROM meal_plans WHERE student_id = $1`, [id]);
    let result;
    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE meal_plans
         SET plan_type = $1, total_credits = $2, expires_at = $3, used_credits = 0
         WHERE student_id = $4 RETURNING *`,
        [planType, totalCredits, expiresAt, id]
      );
    } else {
      result = await query(
        `INSERT INTO meal_plans (student_id, plan_type, total_credits, expires_at, semester)
         VALUES ($1, $2, $3, $4, 'Fall 2026') RETURNING *`,
        [id, planType, totalCredits, expiresAt]
      );
    }
    res.json({ success: true, data: { mealPlan: result.rows[0] } });
  } catch (err) {
    next(err);
  }
}

export async function overrideMealPlanCredits(req, res, next) {
  const { id } = req.params;
  const { amount, reason } = req.body;
  try {
    const mpResult = await query(`SELECT id, total_credits, used_credits FROM meal_plans WHERE student_id = $1`, [id]);
    if (mpResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meal plan not found' });
    }
    const mealPlan = mpResult.rows[0];
    const newTotal = parseFloat(mealPlan.total_credits) + parseFloat(amount);
    
    await query(
      `UPDATE meal_plans SET total_credits = $1 WHERE student_id = $2`,
      [newTotal, id]
    );

    await query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, reason, old_data, new_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user.userId,
        'CREDIT_OVERRIDE',
        'meal_plans',
        mealPlan.id,
        reason || 'Admin credit manual override',
        JSON.stringify({ total_credits: mealPlan.total_credits }),
        JSON.stringify({ total_credits: newTotal })
      ]
    );
    res.json({ success: true, message: 'Credits updated successfully', data: { newTotal } });
  } catch (err) {
    next(err);
  }
}

export async function bulkResetMealPlans(req, res, next) {
  try {
    await query(`UPDATE meal_plans SET used_credits = 0, expires_at = NOW() + INTERVAL '120 days'`);
    await query(
      `INSERT INTO audit_logs (user_id, action, table_name, reason)
       VALUES ($1, $2, $3, $4)`,
      [req.user.userId, 'SEMESTER_RESET', 'meal_plans', 'Bulk semester reset of used credits']
    );
    res.json({ success: true, message: 'Bulk reset complete' });
  } catch (err) {
    next(err);
  }
}

// --- REFUNDS & VOIDS ---
export async function getMenuItemIngredients(req, res, next) {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT
         mii.menu_item_id,
         mii.ingredient_id,
         inv.ingredient_name,
         inv.unit,
         mii.quantity_required
       FROM menu_item_ingredients mii
       JOIN inventory inv ON inv.id = mii.ingredient_id
       WHERE mii.menu_item_id = $1
       ORDER BY inv.ingredient_name ASC`,
      [id]
    );

    res.json({ success: true, data: { ingredients: result.rows } });
  } catch (err) {
    next(err);
  }
}

export async function upsertMenuItemIngredients(req, res, next) {
  const { id } = req.params;
  const { ingredients } = req.body;

  try {
    // ingredients: [{ingredientId, quantityRequired}]
    await query(`DELETE FROM menu_item_ingredients WHERE menu_item_id = $1`, [id]);

    if (!ingredients?.length) {
      return res.json({ success: true, data: { ingredients: [] } });
    }

    // Insert rows
    for (const row of ingredients) {
      const ingredientId = row.ingredientId;
      const quantityRequired = row.quantityRequired;

      await query(
        `INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_required)
         VALUES ($1, $2, $3)`,
        [id, ingredientId, quantityRequired]
      );
    }

    // Return updated rows
    const result = await query(
      `SELECT
         mii.menu_item_id,
         mii.ingredient_id,
         inv.ingredient_name,
         inv.unit,
         mii.quantity_required
       FROM menu_item_ingredients mii
       JOIN inventory inv ON inv.id = mii.ingredient_id
       WHERE mii.menu_item_id = $1
       ORDER BY inv.ingredient_name ASC`,
      [id]
    );

    res.json({ success: true, data: { ingredients: result.rows } });
  } catch (err) {
    next(err);
  }
}

export async function refundOrder(req, res, next) {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const orderResult = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const order = orderResult.rows[0];

    // POS policy: served items are never refundable/voidable
    if (order.status === 'served') {
      return res.status(400).json({
        success: false,
        message: 'Served orders cannot be voided/refunded',
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order already cancelled' });
    }


    if (order.payment_method === 'meal_plan' && order.student_id) {
      const mpResult = await query(`SELECT id, used_credits FROM meal_plans WHERE student_id = $1`, [order.student_id]);
      if (mpResult.rows.length > 0) {
        const mealPlan = mpResult.rows[0];
        const newUsed = Math.max(0, parseFloat(mealPlan.used_credits) - parseFloat(order.total_amount));
        await query(`UPDATE meal_plans SET used_credits = $1 WHERE id = $2`, [newUsed, mealPlan.id]);
      }
    }

    await query(`UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [order.id]);
    await query(`UPDATE payments SET status = 'refunded' WHERE order_id = $1`, [order.id]);

    await query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.userId, 'REFUND', 'orders', order.id, reason || 'Admin refund void']
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('order_cancelled', { orderId: order.id, orderNumber: order.order_number });
      io.emit('order:status', { orderId: order.id, status: 'cancelled' });
    }

    res.json({ success: true, message: 'Order voided and refunded successfully' });
  } catch (err) {
    next(err);
  }
}