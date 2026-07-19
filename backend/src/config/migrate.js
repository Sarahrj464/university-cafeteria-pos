import pool from './db.js';

const migrations = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) CHECK (role IN ('admin', 'cashier', 'kitchen', 'student')) NOT NULL,
  student_id VARCHAR(20) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  wallet_balance DECIMAL(10,2) DEFAULT 0
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_type VARCHAR(30) CHECK (plan_type IN ('unlimited', '14_meal', '7_meal', 'block_50', 'dining_dollars')),
  total_credits DECIMAL(10,2) DEFAULT 0,
  used_credits DECIMAL(10,2) DEFAULT 0,
  remaining_credits DECIMAL(10,2) GENERATED ALWAYS AS (total_credits - used_credits) STORED,
  semester VARCHAR(20),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(50),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  is_daily_special BOOLEAN DEFAULT false,
  prep_time_minutes INT DEFAULT 5,
  allergens TEXT[],
  dietary_tags TEXT[],
  nutritional_info JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES menu_items(id),
  ingredient_name VARCHAR(100),
  current_stock DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(20),
  low_stock_threshold DECIMAL(10,2) DEFAULT 10,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Bill of Materials (Recipe) mapping: which ingredients are required for each menu item
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  quantity_required DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(menu_item_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  cashier_id UUID REFERENCES users(id),
  student_id UUID REFERENCES users(id),
  status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled')) DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  promo_code_id UUID REFERENCES promo_codes(id),
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(30) CHECK (payment_method IN ('cash', 'card', 'meal_plan', 'campus_wallet', 'qr_upi')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================================
-- PROMO CODES
-- =========================================================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) CHECK (discount_type IN ('percent','fixed')) NOT NULL DEFAULT 'percent',
  discount_value DECIMAL(10,2) NOT NULL,
  min_subtotal DECIMAL(10,2) DEFAULT 0,
  max_uses INT DEFAULT 0,
  times_used INT DEFAULT 0,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================================
-- Idempotency record so we only deduct stock once per order when status becomes confirmed
-- (moved here, AFTER "orders" table, since it references orders(id))
CREATE TABLE IF NOT EXISTS order_inventory_deductions (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  deducted_at TIMESTAMP DEFAULT NOW(),
  out_of_stock JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  item_name VARCHAR(100),
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  modifiers JSONB,
  subtotal DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(30) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_ref VARCHAR(100),
  processed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID REFERENCES users(id),
  opened_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  opening_cash DECIMAL(10,2),
  closing_cash DECIMAL(10,2),
  total_sales DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('open', 'closed')) DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(50),
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS modifiers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS prep_time_minutes INT DEFAULT 5;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('cash', 'card', 'meal_plan', 'campus_wallet', 'qr_upi', 'split'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('topup', 'deduction', 'refund')) NOT NULL,
  reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================================
-- NEW: meal_period support — one menu item can be shown under multiple
-- serving windows (breakfast/lunch/dinner) instead of duplicating the row.
-- =========================================================================
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS meal_period TEXT[] DEFAULT ARRAY['breakfast','lunch','dinner'];

-- Unique constraint so re-running seed.js with ON CONFLICT works cleanly
-- and so the same dish can never be inserted twice under one category.
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_name_unique;
ALTER TABLE menu_items ADD CONSTRAINT menu_items_category_name_unique UNIQUE (category_id, name);

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_unique;
ALTER TABLE categories ADD CONSTRAINT categories_name_unique UNIQUE (name);

-- =========================================================================
-- NEW: Combo / Bundle deals (e.g. Burger + Fries + Drink @ discounted price)
-- =========================================================================
CREATE TABLE IF NOT EXISTS combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  discount_type VARCHAR(20) CHECK (discount_type IN ('fixed_price','percent_off')) NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS combo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID REFERENCES combos(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  -- if is_swappable = true, cashier/student can pick any item sharing the
  -- same swap_group (e.g. "any cold drink") instead of the fixed menu_item_id
  is_swappable BOOLEAN DEFAULT false,
  swap_group VARCHAR(50)
);

-- Track which order_items belong to a combo, and which combo "instance"
-- inside the same order they belong to (so 2x of the same combo don't merge).
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS combo_id UUID REFERENCES combos(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS combo_instance_id UUID;

-- =========================================================================
-- NEW: unique constraint needed for seed-ingredients.js's
-- "ON CONFLICT (ingredient_name) DO UPDATE" to work.
-- =========================================================================
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_ingredient_name_unique;
ALTER TABLE inventory ADD CONSTRAINT inventory_ingredient_name_unique UNIQUE (ingredient_name);
`;

async function migrate() {
  const { env } = await import('./env.js');

  if (!env.databaseUrl) {
    console.error('Migration failed: DATABASE_URL is not set in backend/.env');
    process.exit(1);
  }

  try {
    await pool.query(migrations);
    console.log('Database migration completed successfully.');
  } catch (err) {
    const hint =
      err.code === 'ECONNREFUSED'
        ? 'Cannot reach PostgreSQL. Check DATABASE_URL and that the database is running.'
        : err.message || 'Unknown database error';
    console.error('Migration failed:', hint);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();