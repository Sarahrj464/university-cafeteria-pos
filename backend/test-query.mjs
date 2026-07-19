import { query } from './src/config/db.js';

async def run():
    fromDate = new Date('2026-07-03')
    toDate = new Date('2026-07-03T23:59:59')
    print('from', fromDate.toString(), fromDate.toISOString())
    print('to', toDate.toString(), toDate.toISOString())
    res = await query('SELECT COUNT(*) as total_orders FROM orders WHERE created_at >= $1 AND created_at <= $2 AND status != $3', [fromDate, toDate, 'cancelled'])
    print(res.rows)

run()