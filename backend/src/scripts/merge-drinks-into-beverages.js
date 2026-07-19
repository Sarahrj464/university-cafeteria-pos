import pool from '../config/db.js';

/**
 * Merges menu items from category "Drinks" into "Beverages".
 * - Updates menu_items.category_id for all items currently referencing Drinks.
 * - Deletes the Drinks category row only after confirming it is no longer referenced.
 *
 * IMPORTANT: run only when you intend to change category assignments.
 */

async function getCategoryIdByName(client, name) {
  const res = await client.query('SELECT id, name FROM categories WHERE name = $1', [name]);
  return res.rows[0]?.id || null;
}

async function countMenuItemsByCategoryId(client, categoryId) {
  if (!categoryId) return 0;
  const res = await client.query('SELECT COUNT(*)::int AS count FROM menu_items WHERE category_id = $1', [categoryId]);
  return res.rows[0]?.count ?? 0;
}

async function updateMenuItemsCategoryId(client, fromCategoryId, toCategoryId) {
  const res = await client.query(
    'UPDATE menu_items SET category_id = $1 WHERE category_id = $2',
    [toCategoryId, fromCategoryId]
  );
  return res.rowCount ?? 0;
}

async function deleteCategoryIfUnreferenced(client, categoryId) {
  const remaining = await countMenuItemsByCategoryId(client, categoryId);
  if (remaining !== 0) {
    throw new Error(`Refusing to delete category_id=${categoryId}; still referenced by ${remaining} menu_items.`);
  }
  const del = await client.query('DELETE FROM categories WHERE id = $1', [categoryId]);
  return del.rowCount ?? 0;
}

async function main() {
  const fromName = 'Drinks';
  const toName = 'Beverages';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const fromId = await getCategoryIdByName(client, fromName);
    const toId = await getCategoryIdByName(client, toName);

    if (!fromId) {
      console.log(`[merge] Category '${fromName}' not found. Nothing to do.`);
      await client.query('ROLLBACK');
      return;
    }

    if (!toId) {
      console.log(`[merge] Category '${toName}' not found. Cannot merge '${fromName}' into '${toName}'.`);
      await client.query('ROLLBACK');
      process.exitCode = 1;
      return;
    }

    const preCount = await countMenuItemsByCategoryId(client, fromId);
    const alreadyInBeveragesCount = await countMenuItemsByCategoryId(client, toId);

    console.log(`[merge] Pre counts: '${fromName}' menu_items=${preCount}, '${toName}' menu_items=${alreadyInBeveragesCount}`);

    if (preCount === 0) {
      console.log(`[merge] No menu_items reference '${fromName}'. Attempting safe delete...`);
      await deleteCategoryIfUnreferenced(client, fromId);
      await client.query('COMMIT');
      console.log('[merge] Done (category deleted safely).');
      return;
    }

    const moved = await updateMenuItemsCategoryId(client, fromId, toId);
    console.log(`[merge] Updated menu_items.category_id from '${fromName}' -> '${toName}'. Moved rowCount=${moved}`);

    // Confirm counts after update
    const fromRemaining = await countMenuItemsByCategoryId(client, fromId);
    const toNewCount = await countMenuItemsByCategoryId(client, toId);

    console.log(`[merge] Post counts: '${fromName}' menu_items=${fromRemaining}, '${toName}' menu_items=${toNewCount}`);

    await deleteCategoryIfUnreferenced(client, fromId);

    await client.query('COMMIT');
    console.log('[merge] Done (category deleted safely).');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[merge] Failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

main();

