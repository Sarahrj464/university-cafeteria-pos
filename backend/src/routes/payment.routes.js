import { Router } from 'express';
import { processPayment, splitPayment } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);
router.use(requireRoles('admin', 'cashier'));

router.post('/process', processPayment);
router.post('/split', splitPayment);

export default router;
