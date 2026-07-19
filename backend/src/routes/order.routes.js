import { Router } from 'express';
import {
  createOrderHandler,
  getOrder,
  updateStatus,
  listOrdersHandler,
  getDisplayOrders,
  emailReceipt,
} from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireCashier, requireKitchen } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { orderSchema } from '../utils/joi.schemas.js';

const router = Router();

router.get('/display', getDisplayOrders);

router.use(authenticate);

router.get('/', requireKitchen, listOrdersHandler);
router.post('/', requireCashier, validateBody(orderSchema), createOrderHandler);
router.post('/:id/receipt', requireCashier, emailReceipt);
router.get('/:id', requireCashier, getOrder);
router.put('/:id/status', requireKitchen, updateStatus);

export default router;
