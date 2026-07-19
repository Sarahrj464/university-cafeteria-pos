import { setFlashDiscount, clearFlashDiscount, listFlashDiscounts } from '../services/flash-discount.service.js';

export function getFlashDiscountsHandler(req, res) {
  res.json({ success: true, data: { discounts: listFlashDiscounts() } });
}

export function setFlashDiscountHandler(req, res, next) {
  try {
    const { menuItemId, percentage } = req.body;
    const applied = setFlashDiscount(menuItemId, percentage);
    res.json({ success: true, data: { discount: { menuItemId, percentage: applied } } });
  } catch (err) {
    next(err);
  }
}

export function clearFlashDiscountHandler(req, res, next) {
  try {
    const { menuItemId } = req.params;
    clearFlashDiscount(menuItemId);
    res.json({ success: true, message: 'Flash discount cleared' });
  } catch (err) {
    next(err);
  }
}
