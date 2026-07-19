import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireCashier, requireRoles } from '../middleware/rbac.js';
import {
  openShiftHandler,
  closeShiftHandler,
  getActiveShiftHandler,
  getShiftSummaryHandler,
  listShiftsHandler,
} from '../controllers/shift.controller.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { shiftOpenSchema, shiftCloseSchema } from '../utils/joi.schemas.js';

const router = Router();

router.use(authenticate);

router.get('/active', requireCashier, getActiveShiftHandler);
router.post('/open', requireCashier, validateBody(shiftOpenSchema), openShiftHandler);
router.put('/:id/close', requireCashier, validateBody(shiftCloseSchema), closeShiftHandler);
router.get('/:id/summary', requireCashier, getShiftSummaryHandler);
router.get('/', requireRoles('admin'), listShiftsHandler);

export default router;
