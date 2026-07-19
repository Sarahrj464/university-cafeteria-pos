import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import {
  getFlashDiscountsHandler,
  setFlashDiscountHandler,
  clearFlashDiscountHandler,
} from '../controllers/flash-discount.controller.js';

const router = Router();

router.use(authenticate, requireRoles('admin'));
router.get('/', getFlashDiscountsHandler);
router.post('/', setFlashDiscountHandler);
router.delete('/:menuItemId', clearFlashDiscountHandler);

export default router;
