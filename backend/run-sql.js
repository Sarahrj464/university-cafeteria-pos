import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error('.env file not found');
  process.exit(1);
}
dotenv.config({ path: envPath });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
try {
  console.log('--- QUERY CATEGORIES ---');
  const q1 = `SELECT id, name FROM categories WHERE id IN ('233b2dd2-a1fa-48a3-9d34-eea1e5d93efb', '642e1597-05f4-4b6e-b047-99e8aa95dd3d', '971ba8d4-1ac3-4dad-b745-acb9212b6d47');`;
  const res1 = await pool.query(q1);
  console.log('rows1', res1.rowCount);
  res1.rows.forEach(r => console.log(JSON.stringify(r)));

  console.log('--- QUERY ORDER ITEMS COUNT ---');
  const q2 = `SELECT COUNT(*) FROM order_items WHERE menu_item_id = 'bac75d69-01c7-4a5d-876b-0ce46691b4d4';`;
  const res2 = await pool.query(q2);
  console.log('rows2', res2.rowCount);
  res2.rows.forEach(r => console.log(JSON.stringify(r)));
} catch (err) {
  console.error('ERROR', err);
  process.exit(1);
} finally {
  await pool.end();
}
