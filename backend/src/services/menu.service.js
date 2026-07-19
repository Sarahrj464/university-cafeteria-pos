import { query } from '../config/db.js';
import { getFlashDiscount } from './flash-discount.service.js';

export async function getCategories() {
  const result = await query(
    `SELECT id, name, icon, display_order, is_active
     FROM categories
     WHERE is_active = true
     ORDER BY display_order ASC, name ASC`
  );
  return result.rows.map(formatCategory);
}

export async function getMenuItems({ categoryId, search, availableOnly = true }) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  // Always exclude soft-deleted menu items from lists.
  conditions.push('mi.is_active = true');

  // NEW: exclude items whose category has been soft-deleted
  // (e.g. old "Beverages"/"Meals"/"Lunch"/"Dinner" categories).
  conditions.push('c.is_active = true');

  if (availableOnly) {
    conditions.push('mi.is_available = true');
  }

  if (categoryId && categoryId !== 'all') {
    conditions.push(`mi.category_id = $${paramIndex++}`);
    params.push(categoryId);
  }

  if (search?.trim()) {
    conditions.push(`(mi.name ILIKE $${paramIndex} OR mi.description ILIKE $${paramIndex})`);
    params.push(`%${search.trim()}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT mi.id, mi.category_id, mi.name, mi.description, mi.price, mi.image_url,
            mi.is_available, mi.is_daily_special, mi.prep_time_minutes,
            mi.allergens, mi.dietary_tags, mi.modifiers, mi.nutritional_info,
            c.name AS category_name
     FROM menu_items mi
     INNER JOIN categories c ON c.id = mi.category_id
     ${whereClause}
     ORDER BY mi.name ASC`,
    params
  );

  return result.rows.map(formatMenuItem);
}

export async function getMenuItemById(id) {
  const result = await query(
    `SELECT mi.id, mi.category_id, mi.name, mi.description, mi.price, mi.image_url,
            mi.is_available, mi.is_daily_special, mi.prep_time_minutes,
            mi.allergens, mi.dietary_tags, mi.modifiers, mi.nutritional_info,
            c.name AS category_name
     FROM menu_items mi
     LEFT JOIN categories c ON c.id = mi.category_id
     WHERE mi.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Menu item not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return formatMenuItem(result.rows[0]);
}

function formatMenuItem(row) {
  const basePrice = parseFloat(row.price);
  const flashDiscountPercent = getFlashDiscount(row.id);
  const hasFlashDiscount = Number.isFinite(flashDiscountPercent) && flashDiscountPercent > 0;
  const flashDiscountPrice = hasFlashDiscount
    ? parseFloat((basePrice * (1 - flashDiscountPercent / 100)).toFixed(2))
    : basePrice;

  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    name: row.name,
    description: row.description,
    price: basePrice,
    imageUrl: row.image_url,
    isAvailable: row.is_available,
    isDailySpecial: row.is_daily_special,
    prepTimeMinutes: row.prep_time_minutes,
    allergens: row.allergens || [],
    dietaryTags: row.dietary_tags || [],
    modifiers: row.modifiers || [],
    nutritionalInfo: row.nutritional_info || {},
    flashDiscountPercent: hasFlashDiscount ? flashDiscountPercent : 0,
    flashDiscountPrice,
  };
}

function formatCategory(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}
