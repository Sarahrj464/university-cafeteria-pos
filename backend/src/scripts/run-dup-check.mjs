import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { query } from '../config/db.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, '..', '.env'),
});


async function main() {

  console.log('[db]', {
    databaseUrlIsSet: Boolean(env.databaseUrl),
    nodeEnv: env.nodeEnv,
  });

  const result1 = await query(
    `SELECT id, name, category_id, created_at
     FROM menu_items
     WHERE name IN ($1, $2)
     ORDER BY name`,
    ['Almond Chocolate Bar', 'Cold Coffee'],
  );

  const dupes = await query(
    `SELECT name, COUNT(*)::int AS occurrences
     FROM menu_items
     GROUP BY name
     HAVING COUNT(*) > 1
     ORDER BY occurrences DESC, name ASC`,
  );

  console.log(
    JSON.stringify(
      { result1: result1.rows, duplicatesByName: dupes.rows },
      null,
      2,
    ),
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });


