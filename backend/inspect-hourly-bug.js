import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) { console.error('.env file not found'); process.exit(1); }
dotenv.config({ path: envPath });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: false });
try {
  await client.connect();
  console.log('Recent orders (last 20):');
  const recent = await client.query(`SELECT id, created_at, created_at AT TIME ZONE 'Asia/Karachi' AS local_ts, EXTRACT(HOUR FROM created_at) AS utc_hour, EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Karachi') AS karachi_hour FROM orders ORDER BY created_at DESC LIMIT 20;`);
  recent.rows.forEach(r => console.log(JSON.stringify(r)));
  console.log('\nCurrent buggy hourly aggregation:');
  const buggy = await client.query(`SELECT EXTRACT(HOUR FROM created_at) AS hour, COUNT(*) AS orders_count FROM orders WHERE created_at >= now() - interval '2 days' AND status != 'cancelled' GROUP BY hour ORDER BY hour;`);
  buggy.rows.forEach(r => console.log(JSON.stringify(r)));
  console.log('\nCorrected hourly aggregation:');
  const fixed = await client.query(`SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Karachi') AS hour, COUNT(*) AS orders_count FROM orders WHERE created_at >= now() - interval '2 days' AND status != 'cancelled' GROUP BY hour ORDER BY hour;`);
  fixed.rows.forEach(r => console.log(JSON.stringify(r)));
} catch (err) {
  console.error('ERROR', err);
} finally {
  await client.end();
}
