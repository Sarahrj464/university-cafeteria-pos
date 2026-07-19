import { Router } from 'express';
import {
  getStudentMealPlan,
  lookupStudent,
  getStudentOrders,
  getStudentTransactions,
  getWalletBalance,
} from '../controllers/student.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/lookup/:studentId', lookupStudent);
router.get('/:studentId/wallet', getWalletBalance);
router.get('/:id/meal-plan', getStudentMealPlan);
router.get('/:id/orders', getStudentOrders);
router.get('/:id/transactions', getStudentTransactions);

export default router;
