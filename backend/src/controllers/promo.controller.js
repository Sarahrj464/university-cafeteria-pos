import { validatePromoCode } from '../services/promo.service.js';

export async function validatePromoHandler(req, res, next) {
  try {
    const { code, subtotal } = req.body;
    const result = await validatePromoCode({ code, subtotal });
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

