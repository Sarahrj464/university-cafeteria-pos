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
  const res = await client.query("SELECT column_name, data_type, udt_name, is_nullable FROM information_schema.columns WHERE table_name='orders' AND column_name='created_at';");
  console.log(JSON.stringify(res.rows, null, 2));
} catch (err) {
  console.error('ERROR', err);
  process.exit(1);
} finally {
  await client.end();
}
