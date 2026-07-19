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
  const q1 = `UPDATE menu_items SET category_id = '233b2dd2-a1fa-48a3-9d34-eea1e5d93efb' WHERE id = 'bac75d69-01c7-4a5d-876b-0ce46691b4d4';`;
  const q2 = `DELETE FROM menu_items WHERE id = 'e5c925b3-f46a-456c-ac0e-39569e15bfb2';`;
  const q3 = `UPDATE menu_items SET category_id = '971ba8d4-1ac3-4dad-b745-acb9212b6d47' WHERE id = 'f570b2eb-654d-4286-86e0-3a69b97d46cc';`;
  const q4 = `DELETE FROM menu_items WHERE id = 'fd2bba27-a613-494d-a903-62223e1b5d66';`;
  const res1 = await pool.query(q1);
  console.log('q1 rowCount', res1.rowCount);
  const res2 = await pool.query(q2);
  console.log('q2 rowCount', res2.rowCount);
  const res3 = await pool.query(q3);
  console.log('q3 rowCount', res3.rowCount);
  const res4 = await pool.query(q4);
  console.log('q4 rowCount', res4.rowCount);
  await pool.query('COMMIT');
  console.log('COMMIT');
  const qVerify = `SELECT name, COUNT(*) FROM menu_items GROUP BY name HAVING COUNT(*) > 1 ORDER BY name;`;
  const resVerify = await pool.query(qVerify);
  console.log('--- VERIFY DUPLICATES ---');
  console.log('verify rowCount', resVerify.rowCount);
  resVerify.rows.forEach(r => console.log(JSON.stringify(r)));
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
