import pool from '../config/db.js';

function toNumberOrNull(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function validatePromoCode({ code, subtotal }) {
  const normalizedCode = code?.trim().toUpperCase();
  if (!normalizedCode) {
    return { success: false, message: 'Promo code is required' };
  }

  const subtotalNum = toNumberOrNull(subtotal);
  if (subtotalNum == null || subtotalNum < 0) {
    return { success: false, message: 'Invalid subtotal' };
  }

  const result = await pool.query(
    `SELECT id, code, discount_type, discount_value, min_subtotal,
            max_uses, times_used, starts_at, ends_at, is_active
       FROM promo_codes
      WHERE UPPER(code) = $1
        AND is_active = true`,
    [normalizedCode]
  );

  if (result.rows.length === 0) {
    return { success: false, message: 'Invalid promo code' };
  }

  const promo = result.rows[0];

  const now = new Date();
  if (promo.starts_at && now < new Date(promo.starts_at)) {
    return { success: false, message: 'Promo code not active yet' };
  }
  if (promo.ends_at && now > new Date(promo.ends_at)) {
    return { success: false, message: 'Promo code expired' };
  }

  const minSubtotal = toNumberOrNull(promo.min_subtotal) ?? 0;
  if (subtotalNum < minSubtotal) {
    return {
      success: false,
      message: `Minimum subtotal for this promo is ${minSubtotal.toFixed(2)}`,
    };
  }

  const maxUses = toNumberOrNull(promo.max_uses) ?? 0;
  const timesUsed = toNumberOrNull(promo.times_used) ?? 0;
  if (maxUses > 0 && timesUsed >= maxUses) {
    return { success: false, message: 'Promo code usage limit reached' };
  }

  let discountAmount = 0;
  if (promo.discount_type === 'percent') {
    const percent = toNumberOrNull(promo.discount_value) ?? 0;
    discountAmount = (subtotalNum * percent) / 100;
  } else if (promo.discount_type === 'fixed') {
    const fixed = toNumberOrNull(promo.discount_value) ?? 0;
    discountAmount = fixed;
  }

  // Clamp discount so it can never exceed subtotal or go negative.
  discountAmount = Math.max(0, Math.min(discountAmount, subtotalNum));
  discountAmount = Number(discountAmount.toFixed(2));

  return {
    success: true,
    data: {
      promo_code_id: promo.id,
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: Number(promo.discount_value),
      discount_amount: discountAmount,
      applies_to: 'subtotal',
    },
  };
}

