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
  console.log('BEGIN');
  await pool.query('BEGIN');
  const commands = [
    `DELETE FROM menu_items WHERE id = 'e5c925b3-f46a-456c-ac0e-39569e15bfb2';`,
    `UPDATE menu_items SET category_id = '233b2dd2-a1fa-48a3-9d34-eea1e5d93efb' WHERE id = 'bac75d69-01c7-4a5d-876b-0ce46691b4d4';`,
    `DELETE FROM menu_items WHERE id = 'fd2bba27-a613-494d-a903-62223e1b5d66';`,
    `UPDATE menu_items SET category_id = '971ba8d4-1ac3-4dad-b745-acb9212b6d47' WHERE id = 'f570b2eb-654d-4286-86e0-3a69b97d46cc';`
  ];
  for (let i = 0; i < commands.length; i++) {
    const res = await pool.query(commands[i]);
    console.log(`command ${i+1} rowCount`, res.rowCount);
  }
  await pool.query('COMMIT');
  console.log('COMMIT');
  const resVerify = await pool.query(`SELECT name, COUNT(*) FROM menu_items GROUP BY name HAVING COUNT(*) > 1 ORDER BY name;`);
  console.log('--- VERIFY DUPLICATES ---');
  console.log('duplicate rowCount', resVerify.rowCount);
  resVerify.rows.forEach(r => console.log(JSON.stringify(r)));
  const resCount = await pool.query(`SELECT COUNT(*) FROM order_items WHERE menu_item_id IN ('bac75d69-01c7-4a5d-876b-0ce46691b4d4', 'f570b2eb-654d-4286-86e0-3a69b97d46cc');`);
  console.log('--- VERIFY ORDER HISTORY COUNT ---');
  console.log(JSON.stringify(resCount.rows[0]));
} catch (err) {
  console.error('ERROR', err);
  try {
    await pool.query('ROLLBACK');
    console.log('ROLLBACK');
  } catch (rollbackErr) {
    console.error('ROLLBACK ERROR', rollbackErr);
  }
  process.exit(1);
} finally {
  await pool.end();
}
