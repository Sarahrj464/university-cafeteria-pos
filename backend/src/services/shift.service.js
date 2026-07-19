import pool, { query } from '../config/db.js';

async function closeEmptyStaleShifts(cashierId) {
  const result = await query(
    `SELECT s.id, s.opened_at
     FROM shifts s
     WHERE s.cashier_id = $1 AND s.status = 'open'`,
    [cashierId]
  );

  const staleThreshold = Date.now() - 4 * 60 * 60 * 1000;

  for (const row of result.rows) {
    const openedAt = row.opened_at instanceof Date ? row.opened_at.getTime() : new Date(row.opened_at).getTime();
    if (Number.isNaN(openedAt) || openedAt > staleThreshold) {
      continue;
    }

    const orderCount = await query(
      `SELECT COUNT(*)::int AS count
       FROM orders
       WHERE shift_id = $1 AND status != 'cancelled'`,
      [row.id]
    );

    if (orderCount.rows[0].count === 0) {
      await query(
        `UPDATE shifts
         SET status = 'closed', closed_at = NOW(), closing_cash = opening_cash, total_sales = 0
         WHERE id = $1`,
        [row.id]
      );
    }
  }
}

export async function getActiveShift(cashierId) {
  const result = await query(
    `SELECT s.*, u.name as cashier_name
     FROM shifts s
     JOIN users u ON s.cashier_id = u.id
     WHERE s.cashier_id = $1 AND s.status = 'open'
     ORDER BY s.opened_at DESC
     LIMIT 1`,
    [cashierId]
  );
  return result.rows[0] || null;
}

export async function openShift(cashierId, openingCash) {
  const active = await getActiveShift(cashierId);
  if (active) {
    const error = new Error('You already have an active open shift');
    error.statusCode = 400;
    error.code = 'SHIFT_ALREADY_OPEN';
    throw error;
  }

  const result = await query(
    `INSERT INTO shifts (cashier_id, opening_cash, status, opened_at)
     VALUES ($1, $2, 'open', NOW())
     RETURNING *`,
    [cashierId, openingCash]
  );
  return result.rows[0];
}

export async function getShiftSummary(shiftId) {
  const shiftResult = await query(
    `SELECT s.*, u.name as cashier_name 
     FROM shifts s
     JOIN users u ON s.cashier_id = u.id
     WHERE s.id = $1`,
    [shiftId]
  );

  if (shiftResult.rows.length === 0) {
    const error = new Error('Shift not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const shift = shiftResult.rows[0];

  const countResult = await query(
    `SELECT COUNT(*)::int as count
     FROM orders
     WHERE shift_id = $1 AND status != 'cancelled'`,
    [shiftId]
  );
  const ordersProcessed = countResult.rows[0].count;

  const orderTotalsResult = await query(
    `SELECT
       COALESCE(SUM(subtotal), 0)::float as subtotal,
       COALESCE(SUM(discount_amount), 0)::float as discount,
       COALESCE(SUM(tax_amount), 0)::float as tax,
       COALESCE(SUM(total_amount), 0)::float as total
     FROM orders
     WHERE shift_id = $1 AND status != 'cancelled'`,
    [shiftId]
  );

  const {
    subtotal: subtotalAmount,
    discount: discountAmount,
    tax: taxAmount,
    total: orderTotalSales,
  } = orderTotalsResult.rows[0];

  const paymentMethodResult = await query(
    `SELECT
       SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END)::float as cash,
       SUM(CASE WHEN p.method = 'card' THEN p.amount ELSE 0 END)::float as card,
       SUM(CASE WHEN p.method = 'meal_plan' THEN p.amount ELSE 0 END)::float as meal_plan,
       SUM(CASE WHEN p.method IN ('campus_wallet', 'wallet') THEN p.amount ELSE 0 END)::float as wallet,
       SUM(CASE WHEN p.method = 'qr_upi' THEN p.amount ELSE 0 END)::float as qr_upi,
       SUM(CASE WHEN p.method = 'split' THEN p.amount ELSE 0 END)::float as split
     FROM payments p
     JOIN orders o ON p.order_id = o.id
     WHERE o.shift_id = $1 AND p.status = 'completed' AND o.status != 'cancelled'`,
    [shiftId]
  );

  const breakdown = {
    cash: parseFloat(paymentMethodResult.rows[0].cash || 0),
    card: parseFloat(paymentMethodResult.rows[0].card || 0),
    meal_plan: parseFloat(paymentMethodResult.rows[0].meal_plan || 0),
    wallet: parseFloat(paymentMethodResult.rows[0].wallet || 0),
    qr_upi: parseFloat(paymentMethodResult.rows[0].qr_upi || 0),
    split: parseFloat(paymentMethodResult.rows[0].split || 0),
  };

  const totalSales = orderTotalSales;
  const breakdownSum =
    breakdown.cash +
    breakdown.card +
    breakdown.meal_plan +
    breakdown.wallet +
    breakdown.qr_upi +
    breakdown.split;

  if (Math.abs(totalSales - breakdownSum) > 0.01) {
    console.warn(
      'Shift summary totals mismatch for shift',
      shiftId,
      { totalSales, breakdownSum, orderTotalSales, breakdown },
    );
  }

  const openingCash = parseFloat(shift.opening_cash) || 0;
  const cashSales = breakdown.cash;
  const expectedCash = openingCash + cashSales;

  let actualCash = null;
  let variance = 0;
  if (shift.status === 'closed') {
    actualCash = shift.closing_cash !== null ? parseFloat(shift.closing_cash) : null;
    variance = actualCash !== null ? actualCash - expectedCash : 0;
  }

  // Duration must be computed client-side (live-updating) using the same
  // openedAt/started timestamp the top-bar timer uses.
  // We still expose openedAt/closedAt so the UI can compute elapsed time.
  const openedAt = shift.opened_at;
  const closedAt = shift.closed_at;

  return {
    id: shift.id,
    cashierId: shift.cashier_id,
    cashierName: shift.cashier_name,
    openedAt,
    closedAt,
    openingCash,
    closingCash: actualCash,
    status: shift.status,
    ordersProcessed,
    subtotalAmount,
    discountAmount,
    taxAmount,
    totalSales,
    cashSales: breakdown.cash,
    cardSales: breakdown.card,
    mealPlanSales: breakdown.meal_plan,
    walletSales: breakdown.wallet,
    qrUpiSales: breakdown.qr_upi,
    splitSales: breakdown.split,
    expectedCash,
    actualCash,
    variance,
  };
}


export async function closeShift(shiftId, closingCash) {
  // Close only if the shift exists and is currently open.
  // This prevents accidentally closing (or re-closing) an old shift and
  // ensures subsequent “active shift” queries cannot inherit stale start times.
  const updateResult = await query(
    `UPDATE shifts 
     SET status = 'closed', closed_at = NOW(), closing_cash = $1, total_sales = $2
     WHERE id = $3 AND status = 'open'
     RETURNING id`,
    [closingCash, 0, shiftId]
  );

  // If nothing updated, fall back to the latest summary.
  // (Could be already closed or the id doesn't exist.)
  if (updateResult.rows.length === 0) {
    return getShiftSummary(shiftId);
  }

  // Now that the shift is marked closed, compute totals once and persist them.
  const summary = await getShiftSummary(shiftId);
  await query(
    `UPDATE shifts SET total_sales = $1 WHERE id = $2`,
    [summary.totalSales, shiftId]
  );

  return getShiftSummary(shiftId);
}


export async function listShifts({ cashierId, status, limit = 50 } = {}) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (cashierId) {
    conditions.push(`s.cashier_id = $${paramIndex++}`);
    params.push(cashierId);
  }

  if (status) {
    conditions.push(`s.status = $${paramIndex++}`);
    params.push(status);
  }

  const queryText = `
    SELECT s.*, u.name as cashier_name
    FROM shifts s
    JOIN users u ON s.cashier_id = u.id
    ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
    ORDER BY s.opened_at DESC
    LIMIT $${paramIndex++}
  `;
  params.push(limit);

  const result = await query(queryText, params);
  return result.rows.map((row) => ({
    id: row.id,
    cashierId: row.cashier_id,
    cashierName: row.cashier_name,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    openingCash: parseFloat(row.opening_cash),
    closingCash: row.closing_cash ? parseFloat(row.closing_cash) : null,
    totalSales: parseFloat(row.total_sales),
    status: row.status,
  }));
}
