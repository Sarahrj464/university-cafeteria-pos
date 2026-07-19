import { query } from '../config/db.js';
import { getCategories, getMenuItems, getMenuItemById } from '../services/menu.service.js';

export async function listCategories(req, res, next) {
  try {
    const categories = await getCategories();
    res.json({ success: true, data: { categories } });
  } catch (err) {
    next(err);
  }
}

export async function listMenuItems(req, res, next) {
  try {
    const { category, search, available } = req.query;
    const items = await getMenuItems({
      categoryId: category,
      search,
      availableOnly: available !== 'false',
    });
    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
}

export async function getMenuItem(req, res, next) {
  try {
    const item = await getMenuItemById(req.params.id);
    res.json({ success: true, data: { item } });
  } catch (err) {
    next(err);
  }
}

export async function getMenuItemByBarcode(req, res, next) {
  try {
    const { barcode } = req.params;
    const result = await query(
      `SELECT id, name, price, category_id, image_url, is_available
       FROM menu_items
       WHERE barcode = $1 AND is_active = true`,
      [barcode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const item = result.rows[0];

    if (item.is_available === false) {
      return res.status(400).json({ message: 'Item currently unavailable' });
    }

    return res.json({
      id: item.id,
      name: item.name,
      price: parseFloat(item.price),
      category_id: item.category_id,
      image_url: item.image_url,
    });
  } catch (err) {
    next(err);
  }
}
