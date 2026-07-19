import pool, { query } from '../config/db.js';

export async function getStudentMealPlan(req, res, next) {
  const { id } = req.params;

  try {
    const userResult = await query(
      `SELECT id, student_id, name, email, role FROM users WHERE id::text = $1 OR student_id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = userResult.rows[0];

    if (req.user.role === 'student' && req.user.userId !== student.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const mpResult = await query(
      `SELECT id, plan_type, total_credits, used_credits, remaining_credits, semester, expires_at, created_at
       FROM meal_plans
       WHERE student_id = $1`,
      [student.id]
    );

    if (mpResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meal plan not found' });
    }

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          studentId: student.student_id,
          name: student.name,
          email: student.email,
        },
        mealPlan: mpResult.rows[0]
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function lookupStudent(req, res, next) {
  const { studentId } = req.params;

  try {
    const result = await query(
      `SELECT u.id, u.student_id, u.name, u.wallet_balance, mp.plan_type, mp.remaining_credits, mp.expires_at
       FROM users u
       LEFT JOIN meal_plans mp ON mp.student_id = u.id
       WHERE u.student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid Student ID' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        studentName: row.name,
        studentId: row.student_id,
        planType: row.plan_type,
        remainingCredits: row.plan_type ? parseFloat(row.remaining_credits) : 0,
        walletBalance: parseFloat(row.wallet_balance || 0),
        expiresAt: row.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getStudentOrders(req, res, next) {
  const { id } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
  const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;

  try {
    const userResult = await query(
      `SELECT id FROM users WHERE id::text = $1 OR student_id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const studentId = userResult.rows[0].id;

    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const ordersResult = await query(
      `SELECT o.id, o.order_number, o.status, o.subtotal, o.discount_amount, o.tax_amount, o.total_amount, o.payment_method, o.notes, o.created_at
       FROM orders o
       WHERE o.student_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [studentId, limit, offset]
    );

    const orders = [];
    for (const row of ordersResult.rows) {
      const itemsResult = await query(
        `SELECT id, menu_item_id, item_name, quantity, unit_price, modifiers, subtotal
         FROM order_items WHERE order_id = $1`,
        [row.id]
      );
      orders.push({
        id: row.id,
        orderNumber: row.order_number,
        status: row.status,
        subtotal: parseFloat(row.subtotal),
        discountAmount: parseFloat(row.discount_amount),
        taxAmount: parseFloat(row.tax_amount),
        totalAmount: parseFloat(row.total_amount),
        paymentMethod: row.payment_method,
        notes: row.notes,
        createdAt: row.created_at,
        items: itemsResult.rows.map(item => ({
          id: item.id,
          menuItemId: item.menu_item_id,
          name: item.item_name,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price),
          modifiers: item.modifiers || [],
          subtotal: parseFloat(item.subtotal),
        })),
      });
    }

    res.json({ success: true, data: { orders } });
  } catch (err) {
    next(err);
  }
}

export async function getWalletBalance(req, res, next) {
  const { studentId } = req.params;

  try {
    const result = await query(
      `SELECT wallet_balance FROM users WHERE student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      data: {
        balance: parseFloat(result.rows[0].wallet_balance || 0),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getStudentTransactions(req, res, next) {
  const { id } = req.params;

  try {
    const userResult = await query(
      `SELECT id FROM users WHERE id::text = $1 OR student_id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const studentId = userResult.rows[0].id;

    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const transactionsResult = await query(
      `SELECT p.id, p.amount, p.method, p.status, p.transaction_ref, p.processed_at, o.order_number
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE o.student_id = $1
       ORDER BY p.processed_at DESC`,
      [studentId]
    );

    const transactions = transactionsResult.rows.map(row => ({
      id: row.id,
      amount: parseFloat(row.amount),
      method: row.method,
      status: row.status,
      transactionRef: row.transaction_ref,
      processedAt: row.processed_at,
      orderNumber: row.order_number,
    }));

    res.json({ success: true, data: { transactions } });
  } catch (err) {
    next(err);
  }
}
