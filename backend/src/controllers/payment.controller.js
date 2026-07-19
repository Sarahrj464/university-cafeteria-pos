import pool from "../config/db.js";
import { updateOrderStatus, formatOrder } from "../services/order.service.js";

async function deductMealPlanCredits(client, studentIdString, amount) {
  const planResult = await client.query(
    `SELECT mp.id, mp.remaining_credits
     FROM meal_plans mp
     JOIN users u ON mp.student_id = u.id
     WHERE u.student_id = $1
     FOR UPDATE`,
    [studentIdString],
  );

  if (planResult.rows.length === 0) {
    const error = new Error("Meal plan not found for this student");
    error.statusCode = 404;
    throw error;
  }

  const plan = planResult.rows[0];
  const remaining = parseFloat(plan.remaining_credits);

  if (remaining < amount) {
    const error = new Error("Insufficient meal plan balance");
    error.statusCode = 400;
    error.code = "INSUFFICIENT_BALANCE";
    error.remaining = remaining;
    throw error;
  }

  await client.query(
    `UPDATE meal_plans SET used_credits = used_credits + $1 WHERE id = $2`,
    [amount, plan.id],
  );
}

async function deductWalletBalance(client, studentIdString, amount) {
  const userResult = await client.query(
    `SELECT id, wallet_balance FROM users WHERE student_id = $1 FOR UPDATE`,
    [studentIdString],
  );

  if (userResult.rows.length === 0) {
    const error = new Error("Student not found for wallet payment");
    error.statusCode = 404;
    throw error;
  }

  const user = userResult.rows[0];
  const balance = parseFloat(user.wallet_balance || 0);

  if (balance < amount) {
    const error = new Error("Insufficient wallet balance");
    error.statusCode = 400;
    error.code = "INSUFFICIENT_BALANCE";
    error.remaining = balance;
    throw error;
  }

  await client.query(
    `UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2`,
    [amount, user.id],
  );

  // Log transaction (optional - wallet_transactions table)
  try {
    await client.query(
      `INSERT INTO wallet_transactions (user_id, amount, type, reference)
       VALUES ($1, $2, 'deduction', 'Order payment')`,
      [user.id, amount],
    );
  } catch (txnErr) {
    // Transaction logging is optional, don't fail if it errors
    console.warn("Warning: Could not log wallet transaction", txnErr.message);
  }
}

function emitOrderEvents(req, order, event = "new_order") {
  const io = req.app.get("io");
  if (!io || !order) return;

  const payload = {
    orderId: order.id,
    orderNumber: order.orderNumber || order.order_number,
    status: order.status,
  };

  io.emit(event, payload);
  io.emit(event === "new_order" ? "order:new" : "order:status", payload);
}

function normalizeOrder(row) {
  if (!row) return null;
  if (row.orderNumber) return row;
  return formatOrder(row);
}

export async function processPayment(req, res, next) {
  const { orderId, paymentMethod, amount, transactionRef, studentId } =
    req.body;

  if (!orderId || !paymentMethod || amount === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const dbClient = await pool.connect();
  try {
    await dbClient.query("BEGIN");

    const orderCheck = await dbClient.query(
      "SELECT id FROM orders WHERE id = $1 FOR UPDATE",
      [orderId],
    );
    if (orderCheck.rows.length === 0) {
      await dbClient.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (paymentMethod === "meal_plan") {
      if (!studentId) {
        await dbClient.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "Student ID required for meal plan payment",
        });
      }
      await deductMealPlanCredits(dbClient, studentId, parseFloat(amount));
    }

    if (paymentMethod === "campus_wallet" || paymentMethod === "wallet") {
      if (!studentId) {
        await dbClient.query("ROLLBACK");
        return res
          .status(400)
          .json({
            success: false,
            message: "Student ID required for wallet payment",
          });
      }
      await deductWalletBalance(dbClient, studentId, parseFloat(amount));
    }

    await dbClient.query(
      `INSERT INTO payments (order_id, amount, method, status, transaction_ref)
       VALUES ($1, $2, $3, 'completed', $4)`,
      [orderId, amount, paymentMethod, transactionRef || null],
    );

    const orderResult = await dbClient.query(
      `UPDATE orders SET status = 'confirmed', payment_method = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [paymentMethod, orderId],
    );

    const order = normalizeOrder(orderResult.rows[0]);

    await dbClient.query("COMMIT");
    emitOrderEvents(req, order, "new_order");

    res.json({ success: true, data: { order } });
  } catch (err) {
    await dbClient.query("ROLLBACK");
    next(err);
  } finally {
    dbClient.release();
  }
}

export async function splitPayment(req, res, next) {
  const { orderId, payments, studentId } = req.body;

  if (
    !orderId ||
    !payments ||
    !Array.isArray(payments) ||
    payments.length === 0
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid split payment data" });
  }

  const dbClient = await pool.connect();
  try {
    await dbClient.query("BEGIN");

    const orderCheck = await dbClient.query(
      "SELECT id FROM orders WHERE id = $1 FOR UPDATE",
      [orderId],
    );
    if (orderCheck.rows.length === 0) {
      await dbClient.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    for (const p of payments) {
      if (p.method === "meal_plan") {
        if (!studentId) {
          await dbClient.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: "Student ID required for meal plan split",
          });
        }
        await deductMealPlanCredits(dbClient, studentId, parseFloat(p.amount));
      }

      if (p.method === "campus_wallet" || p.method === "wallet") {
        if (!studentId) {
          await dbClient.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: "Student ID required for wallet split",
          });
        }
        await deductWalletBalance(dbClient, studentId, parseFloat(p.amount));
      }

      await dbClient.query(
        `INSERT INTO payments (order_id, amount, method, status)
         VALUES ($1, $2, $3, 'completed')`,
        [orderId, p.amount, p.method],
      );
    }

    const orderResult = await dbClient.query(
      `UPDATE orders SET status = 'confirmed', payment_method = 'split', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [orderId],
    );

    const order = normalizeOrder(orderResult.rows[0]);

    await dbClient.query("COMMIT");
    emitOrderEvents(req, order, "new_order");

    res.json({ success: true, data: { order } });
  } catch (err) {
    await dbClient.query("ROLLBACK");
    next(err);
  } finally {
    dbClient.release();
  }
}
