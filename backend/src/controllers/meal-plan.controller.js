import pool, { query } from '../config/db.js';

export async function getMealPlan(req, res, next) {
  const { studentId } = req.params; // this is the string student_id like STU-2024-001

  try {
    const result = await query(
      `SELECT mp.*, u.name as student_name 
       FROM meal_plans mp 
       JOIN users u ON mp.student_id = u.id 
       WHERE u.student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meal plan not found for this student ID' });
    }

    res.json({
      success: true,
      data: {
        mealPlan: {
          id: result.rows[0].id,
          planType: result.rows[0].plan_type,
          totalCredits: parseFloat(result.rows[0].total_credits),
          usedCredits: parseFloat(result.rows[0].used_credits),
          remainingCredits: parseFloat(result.rows[0].remaining_credits),
          semester: result.rows[0].semester,
          expiresAt: result.rows[0].expires_at,
          studentName: result.rows[0].student_name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deductCredits(req, res, next) {
  const { studentId } = req.params;
  const { amount } = req.body;

  if (amount === undefined || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid deduction amount' });
  }

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    // Lock the row for update
    const planResult = await dbClient.query(
      `SELECT mp.* 
       FROM meal_plans mp 
       JOIN users u ON mp.student_id = u.id 
       WHERE u.student_id = $1
       FOR UPDATE`,
      [studentId]
    );

    if (planResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Meal plan not found' });
    }

    const plan = planResult.rows[0];
    const remaining = parseFloat(plan.remaining_credits);
    
    if (remaining < amount) {
      await dbClient.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient balance', 
        remaining 
      });
    }

    // Update
    const updateResult = await dbClient.query(
      `UPDATE meal_plans 
       SET used_credits = used_credits + $1 
       WHERE id = $2 
       RETURNING *`,
      [amount, plan.id]
    );

    await dbClient.query('COMMIT');
    res.json({ success: true, data: { mealPlan: updateResult.rows[0] } });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    next(err);
  } finally {
    dbClient.release();
  }
}
