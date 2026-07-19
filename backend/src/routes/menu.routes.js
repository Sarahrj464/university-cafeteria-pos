import { Router } from 'express';
import { listCategories, listMenuItems, getMenuItem, getMenuItemByBarcode } from '../controllers/menu.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireCashier } from '../middleware/rbac.js';

const router = Router();

router.get('/categories', authenticate, listCategories);
router.get('/menu-items', authenticate, listMenuItems);
router.get('/menu-items/barcode/:barcode', authenticate, getMenuItemByBarcode);
router.get('/menu-items/:id', authenticate, getMenuItem);

export default router;
