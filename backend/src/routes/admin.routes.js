import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { listMenuItemBarcodes, regenerateMenuItemBarcode } from '../controllers/admin.controller.js';

import {
  createBackup,
  getAdminSettings,
  updateAdminSettings,
  changeAdminPassword,
  listBackups,
  restoreBackup,

  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  toggleDailySpecial,
  createCategory,
  updateCategory,
  listInventory,
  updateInventory,
  bulkUpdateInventory,
  getInventoryAlerts,
  getSalesReport,
  getTopItemsReport,
  getStaffReport,
  listStaff,
  createStaff,
  toggleStaffStatus,
  getStaffShifts,
  searchStudents,
  updateStudentMealPlan,
  overrideMealPlanCredits,
  bulkResetMealPlans,
  refundOrder,
  getMenuItemIngredients,
  upsertMenuItemIngredients,
} from '../controllers/admin.controller.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { menuItemSchema } from '../utils/joi.schemas.js';

const router = Router();

// Protect all admin endpoints
router.use(authenticate, requireRoles('admin'));

router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);
router.post('/settings/backup', createBackup);
router.get('/settings/backups', listBackups);
router.post('/settings/restore/:backupId', restoreBackup);
router.put('/change-password', changeAdminPassword);


// Menu CRUD
router.post('/menu-items', validateBody(menuItemSchema), createMenuItem);
router.put('/menu-items/:id', validateBody(menuItemSchema), updateMenuItem);
router.delete('/menu-items/:id', deleteMenuItem);
router.patch('/menu-items/:id/availability', toggleAvailability);
router.patch('/menu-items/:id/daily-special', toggleDailySpecial);

// Recipe / BOM
router.get('/menu-items/:id/ingredients', getMenuItemIngredients);
router.put('/menu-items/:id/ingredients', upsertMenuItemIngredients);

router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);


// Inventory
router.get('/inventory', listInventory);
router.put('/inventory/:id', updateInventory);
router.post('/inventory/bulk', bulkUpdateInventory);
router.get('/inventory/alerts', getInventoryAlerts);

// Reports
router.get('/reports/sales', getSalesReport);
router.get('/reports/top-items', getTopItemsReport);
router.get('/reports/staff', getStaffReport);

// Staff
router.get('/staff', listStaff);
router.post('/staff', createStaff);
router.patch('/staff/:id/status', toggleStaffStatus);
router.get('/staff/:id/shifts', getStaffShifts);

// Students & Meal Plans
router.get('/students', searchStudents);
router.put('/students/:id/meal-plan', updateStudentMealPlan);
router.post('/students/:id/meal-plan/override', overrideMealPlanCredits);
router.post('/meal-plans/reset', bulkResetMealPlans);


router.get('/menu-items/barcodes', listMenuItemBarcodes);
router.post('/menu-items/:id/barcode/regenerate', regenerateMenuItemBarcode);

// Refunds
router.post('/orders/:id/refund', refundOrder);

export default router;
