import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

function normalizeDatabaseUrl(url) {
  if (!url) return url;
  const isSupabasePooler = /\.pooler\.supabase\.com:5432(\/.*)?$/i.test(url);
  if (env.nodeEnv !== 'production' && isSupabasePooler) {
    return url.replace(':5432', ':6543');
  }
  return url;
}

const pool = new Pool({
  connectionString: normalizeDatabaseUrl(env.databaseUrl),
  ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export const query = (text, params) => pool.query(text, params);

export default pool;
