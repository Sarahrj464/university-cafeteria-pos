import pool, { query } from '../config/db.js';
import { getActiveShift } from './shift.service.js';

const VALID_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'];
const VALID_PAYMENT_METHODS = ['cash', 'card', 'meal_plan', 'campus_wallet', 'qr_upi', 'split'];

async function generateOrderNumber(client) {
  const year = new Date().getFullYear();
  const result = await client.query(
    `SELECT COUNT(*)::int AS count FROM orders WHERE order_number LIKE $1`,
    [`CF-${year}-%`]
  );
  const seq = String(result.rows[0].count + 1).padStart(4, '0');
  return `CF-${year}-${seq}`;
}

export async function createOrder(cashierId, orderData) {
  const {
    items,
    subtotal,
    discountAmount = 0,
    promoCodeId = null,
    taxAmount,
    totalAmount,
    paymentMethod = null,
    notes,
    studentId,
    status = 'pending',
  } = orderData;

  if (!items?.length) {
    const error = new Error('Order must contain at least one item');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    const error = new Error('Invalid payment method');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const dbClient = await pool.connect();

  try {
    await dbClient.query('BEGIN');

    let resolvedStudentId = null;
    if (studentId?.trim()) {
      const studentResult = await dbClient.query(
        `SELECT id FROM users WHERE student_id = $1 AND role = 'student' AND is_active = true`,
        [studentId.trim()]
      );
      if (studentResult.rows.length > 0) {
        resolvedStudentId = studentResult.rows[0].id;
      }
    }

    // Look up active shift and cashier role
    const userResult = await dbClient.query(`SELECT role FROM users WHERE id = $1`, [cashierId]);
    const userRole = userResult.rows[0]?.role;

    const activeShift = await getActiveShift(cashierId);
    const activeShiftId = activeShift?.id || null;

    if (userRole === 'cashier' && !activeShiftId) {
      const error = new Error('No active shift found. You must start a shift before placing orders.');
      error.statusCode = 400;
      error.code = 'SHIFT_REQUIRED';
      throw error;
    }

    const orderNumber = await generateOrderNumber(dbClient);
    const initialStatus = VALID_STATUSES.includes(status) ? status : 'pending';

    const orderResult = await dbClient.query(
      `INSERT INTO orders (
        order_number, cashier_id, student_id, status,
        subtotal, discount_amount, tax_amount, total_amount,
        payment_method, notes, shift_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, order_number, status, subtotal, discount_amount, tax_amount,
                total_amount, payment_method, notes, created_at, updated_at, shift_id`,
      [
        orderNumber,
        cashierId,
        resolvedStudentId,
        initialStatus,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        paymentMethod,
        notes || null,
        activeShiftId,
      ]
    );

    const order = orderResult.rows[0];

    const orderItems = [];
    for (const item of items) {
      const itemResult = await dbClient.query(
        `INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price, modifiers, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, menu_item_id, item_name, quantity, unit_price, modifiers, subtotal`,
        [
          order.id,
          item.menuItemId,
          item.name,
          item.quantity,
          item.unitPrice,
          JSON.stringify(item.modifiers || []),
          item.subtotal,
        ]
      );
      orderItems.push(formatOrderItem(itemResult.rows[0]));
    }

    await dbClient.query('COMMIT');

    return {
      ...formatOrder(order),
      items: orderItems,
    };
  } catch (err) {
    await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    dbClient.release();
  }
}

export async function listOrders({ status, limit = 500, showCancelled = false } = {}) {
  const conditions = [];
  if (!showCancelled) {
    conditions.push(`o.status NOT IN ('cancelled')`);
  }
  const params = [];
  let paramIndex = 1;

  if (status && status !== 'all') {
    if (status === 'pending') {
      conditions.push(`o.status IN ('pending', 'confirmed')`);
    } else {
      conditions.push(`o.status = $${paramIndex++}`);
      params.push(status);
    }
  }

  params.push(limit);

  const result = await query(
    `SELECT o.id, o.order_number, o.status, o.notes, o.total_amount, o.created_at, o.updated_at,
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'name', oi.item_name,
                  'quantity', oi.quantity,
                  'unitPrice', oi.unit_price,
                  'subtotal', oi.subtotal,
                  'modifiers', COALESCE(oi.modifiers, '[]'::jsonb)
                )
              ) FILTER (WHERE oi.id IS NOT NULL),
              '[]'::jsonb
            ) AS items_json
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
     GROUP BY o.id, o.order_number, o.status, o.notes, o.total_amount, o.created_at, o.updated_at
     ORDER BY o.created_at ASC
     LIMIT $${paramIndex}`,
    params
  );

  return result.rows.map((row) => ({
    ...formatOrder(row),
    items: Array.isArray(row.items_json) ? row.items_json : [],
  }));
}

export async function getOrderById(orderId) {
  const orderResult = await query(
    `SELECT o.id, o.order_number, o.cashier_id, o.student_id, o.status,
            o.subtotal, o.discount_amount, o.tax_amount, o.total_amount,
            o.payment_method, o.notes, o.created_at, o.updated_at,
            u.name AS cashier_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.cashier_id
     WHERE o.id = $1`,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const itemsResult = await query(
    `SELECT id, menu_item_id, item_name, quantity, unit_price, modifiers, subtotal
     FROM order_items WHERE order_id = $1`,
    [orderId]
  );

  return {
    ...formatOrder(orderResult.rows[0]),
    cashierName: orderResult.rows[0].cashier_name,
    items: itemsResult.rows.map(formatOrderItem),
  };
}

export async function updateOrderStatus(orderId, status, performedBy = null) {
  if (!VALID_STATUSES.includes(status)) {
    const error = new Error('Invalid order status');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const dbClient = await pool.connect();

  try {
    await dbClient.query('BEGIN');

    const currentOrderResult = await dbClient.query(
      `SELECT id, order_number, status FROM orders WHERE id = $1`,
      [orderId]
    );

    if (currentOrderResult.rows.length === 0) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const oldStatus = currentOrderResult.rows[0].status;
    if (oldStatus === status) {
      await dbClient.query('COMMIT');
      return formatOrder(currentOrderResult.rows[0]);
    }

    // If transitioning to `confirmed`, perform recipe-based stock deduction.
    const DEDUCTION_TRIGGER_STATUSES = ['confirmed', 'preparing'];
    if (DEDUCTION_TRIGGER_STATUSES.includes(status)) {
      // Idempotency: only deduct once per order.
      const deductionCheck = await dbClient.query(
        `SELECT order_id FROM order_inventory_deductions WHERE order_id = $1`,
        [orderId]
      );

      if (deductionCheck.rows.length === 0) {
        // Lock ingredient rows we might touch during this transaction.
        // We find required ingredients via BOM.
        const orderItemsResult = await dbClient.query(
          `SELECT menu_item_id, quantity FROM order_items WHERE order_id = $1`,
          [orderId]
        );

        const menuItemIds = orderItemsResult.rows.map(r => r.menu_item_id);
        if (menuItemIds.length === 0) {
          const error = new Error('Order has no items to deduct');
          error.statusCode = 400;
          error.code = 'VALIDATION_ERROR';
          throw error;
        }

        // Compute required ingredient quantities.
        // required = sum(quantity_ordered * quantity_required_per_serving)
        // We join:
        //   order_items oi
        //   menu_item_ingredients mii
        //   inventory inv
        const requiredAgg = await dbClient.query(
          `SELECT
              inv.id AS ingredient_id,
              inv.ingredient_name,
              inv.unit,
              SUM(oi.quantity::numeric * mii.quantity_required::numeric) AS required_qty
           FROM order_items oi
           JOIN menu_item_ingredients mii ON mii.menu_item_id = oi.menu_item_id
           JOIN inventory inv ON inv.id = mii.ingredient_id
           WHERE oi.order_id = $1
           GROUP BY inv.id, inv.ingredient_name, inv.unit`,
          [orderId]
        );

        // Lock current inventory rows for those ingredients
        const ingredientIds = requiredAgg.rows.map(r => r.ingredient_id);
        if (ingredientIds.length > 0) {
          await dbClient.query(
            `SELECT id FROM inventory WHERE id = ANY($1::uuid[]) FOR UPDATE`,
            [ingredientIds]
          );
        }

        // Fetch stocks and compare in JS.

        const stocksResult = await dbClient.query(
          `SELECT id, ingredient_name, unit, current_stock FROM inventory WHERE id = ANY($1::uuid[])`,
          [ingredientIds]
        );

        const stockMap = new Map(stocksResult.rows.map(r => [r.id, r]));

        const outOfStock = [];
        for (const reqRow of requiredAgg.rows) {
          const stockRow = stockMap.get(reqRow.ingredient_id);
          const requiredQty = Number(reqRow.required_qty);
          const available = stockRow ? Number(stockRow.current_stock) : 0;
          if (available < requiredQty) {
            outOfStock.push(
              `${stockRow?.ingredient_name || reqRow.ingredient_name} (needed ${requiredQty}, available ${available})`
            );
          }
        }

        if (outOfStock.length > 0) {
          // Block the order confirmation.
          const error = new Error(`Out of stock: ${outOfStock[0]}`);
          error.statusCode = 409;
          error.code = 'OUT_OF_STOCK';

          await dbClient.query(
            `INSERT INTO order_inventory_deductions (order_id, out_of_stock) VALUES ($1, $2::jsonb)
             ON CONFLICT (order_id) DO NOTHING`,
            [orderId, JSON.stringify({ outOfStock })]
          );

          throw error;
        }

        // Deduct stock.
        for (const reqRow of requiredAgg.rows) {
          await dbClient.query(
            `UPDATE inventory
             SET current_stock = current_stock - $1,
                 last_updated = NOW()
             WHERE id = $2`,
            [reqRow.required_qty, reqRow.ingredient_id]
          );
        }

        await dbClient.query(
          `INSERT INTO order_inventory_deductions (order_id)
           VALUES ($1)
           ON CONFLICT (order_id) DO NOTHING`,
          [orderId]
        );
      }
    }

    // Update order status
    const result = await dbClient.query(
      `UPDATE orders SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, order_number, status, updated_at`,
      [status, orderId]
    );

    if (result.rows.length === 0) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const updatedOrder = formatOrder(result.rows[0]);

    const auditPayload = {
      old_data: { status: oldStatus },
      new_data: { status, updatedAt: new Date().toISOString() },
    };

    if (status === 'served') {
      auditPayload.new_data.completedAt = new Date().toISOString();
    }

    await dbClient.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        performedBy,
        'order_status_update',
        'orders',
        orderId,
        JSON.stringify(auditPayload.old_data),
        JSON.stringify(auditPayload.new_data),
      ]
    );

    await dbClient.query('COMMIT');
    return updatedOrder;
  } catch (err) {
    await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    dbClient.release();
  }
}


export async function storeReceipt(orderId, email, receiptHtml) {
  await query(
    `INSERT INTO audit_logs (action, table_name, record_id, new_data)
     VALUES ('email_receipt', 'orders', $1, $2)`,
    [orderId, JSON.stringify({ email, receiptHtml, sentAt: new Date().toISOString() })]
  );
}

function formatOrder(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    cashierId: row.cashier_id,
    studentId: row.student_id,
    status: row.status,
    subtotal: parseFloat(row.subtotal ?? row.total_amount ?? 0),
    discountAmount: parseFloat(row.discount_amount ?? 0),
    taxAmount: parseFloat(row.tax_amount ?? 0),
    totalAmount: parseFloat(row.total_amount ?? 0),
    paymentMethod: row.payment_method,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatOrderItem(row) {
  return {
    id: row.id,
    menuItemId: row.menu_item_id,
    name: row.item_name,
    quantity: row.quantity,
    unitPrice: parseFloat(row.unit_price),
    modifiers: row.modifiers || [],
    subtotal: parseFloat(row.subtotal),
  };
}

export { formatOrder };
