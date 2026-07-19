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
  const queries = [
    "SELECT COUNT(*) FROM order_items WHERE menu_item_id = 'e5c925b3-f46a-456c-ac0e-39569e15bfb2';",
    "SELECT COUNT(*) FROM order_items WHERE menu_item_id = 'f570b2eb-654d-4286-86e0-3a69b97d46cc';",
    "SELECT COUNT(*) FROM order_items WHERE menu_item_id = 'fd2bba27-a613-494d-a903-62223e1b5d66';"
  ];
  for (const q of queries) {
    const res = await pool.query(q);
    console.log(q);
    console.log(JSON.stringify(res.rows[0]));
  }
} catch (err) {
  console.error('ERROR', err);
  process.exit(1);
} finally {
  await pool.end();
}
