import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  validatePromoHandler,
} from '../controllers/promo.controller.js';

const router = Router();

// Promo validate is cashier-accessible (no side effects), so no admin-only restriction.
router.use(authenticate);
router.post('/validate', validatePromoHandler);

export default router;

