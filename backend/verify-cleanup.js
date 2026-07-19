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
  await pool.connect();
  const queries = [
    `SELECT name, COUNT(*) FROM menu_items GROUP BY name HAVING COUNT(*) > 1 ORDER BY name;`,
    `SELECT id, name, category_id FROM menu_items WHERE id IN ('bac75d69-01c7-4a5d-876b-0ce46691b4d4', 'e5c925b3-f46a-456c-ac0e-39569e15bfb2', 'f570b2eb-654d-4286-86e0-3a69b97d46cc', 'fd2bba27-a613-494d-a903-62223e1b5d66') ORDER BY id;`,
    `SELECT COUNT(*) FROM order_items WHERE menu_item_id IN ('bac75d69-01c7-4a5d-876b-0ce46691b4d4', 'f570b2eb-654d-4286-86e0-3a69b97d46cc');`
  ];
  for (const q of queries) {
    const res = await pool.query(q);
    console.log('QUERY:', q);
    console.log('rowCount', res.rowCount);
    res.rows.forEach(r => console.log(JSON.stringify(r)));
  }
} catch (err) {
  console.error('ERROR', err);
  process.exit(1);
} finally {
  await pool.end();
}
