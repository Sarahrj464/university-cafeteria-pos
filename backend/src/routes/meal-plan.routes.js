import { Router } from 'express';
import { getMealPlan, deductCredits } from '../controllers/meal-plan.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);
router.use(requireRoles('admin', 'cashier'));

router.get('/:studentId', getMealPlan);
router.put('/:studentId/deduct', deductCredits);

export default router;
