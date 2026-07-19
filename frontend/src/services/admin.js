import api from './api';

// --- MENU CRUD ---
export const createMenuItem = (data) => api.post('/admin/menu-items', data).then(res => res.data);
export const updateMenuItem = (id, data) => api.put(`/admin/menu-items/${id}`, data).then(res => res.data);
export const deleteMenuItem = (id) => api.delete(`/admin/menu-items/${id}`).then(res => res.data);
export const toggleAvailability = (id, isAvailable) => api.patch(`/admin/menu-items/${id}/availability`, { isAvailable }).then(res => res.data);
export const toggleDailySpecial = (id, isDailySpecial) => api.patch(`/admin/menu-items/${id}/daily-special`, { isDailySpecial }).then(res => res.data);

// --- RECIPE / BOM ---
export const getMenuItemIngredients = (id) => api.get(`/admin/menu-items/${id}/ingredients`).then(res => res.data);
export const updateMenuItemIngredients = (id, ingredients) => api.put(`/admin/menu-items/${id}/ingredients`, { ingredients }).then(res => res.data);

// --- CATEGORY CRUD ---
export const createCategory = (data) => api.post('/admin/categories', data).then(res => res.data);
export const updateCategory = (id, data) => api.put(`/admin/categories/${id}`, data).then(res => res.data);


// --- INVENTORY ---
export const getInventory = () => api.get('/admin/inventory').then(res => res.data);
export const updateInventory = (id, data) => api.put(`/admin/inventory/${id}`, data).then(res => res.data);
export const bulkUpdateInventory = (ingredients) => api.post('/admin/inventory/bulk', { ingredients }).then(res => res.data);
export const getInventoryAlerts = () => api.get('/admin/inventory/alerts').then(res => res.data);

// --- REPORTS ---
export const getSalesReport = (from, to) => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  return api.get(`/admin/reports/sales?${params.toString()}`).then(res => res.data.data);
};
export const getTopItemsReport = (limit = 10) => api.get(`/admin/reports/top-items?limit=${limit}`).then(res => res.data);
export const getStaffReport = () => api.get('/admin/reports/staff').then(res => res.data);

// --- STAFF ---
export const getStaffList = () => api.get('/admin/staff').then(res => res.data);
export const createStaff = (data) => api.post('/admin/staff', data).then(res => res.data);
export const toggleStaffStatus = (id, isActive) => api.patch(`/admin/staff/${id}/status`, { isActive }).then(res => res.data);
export const getStaffShifts = (id) => api.get(`/admin/staff/${id}/shifts`).then(res => res.data);

// --- STUDENTS / MEAL PLANS ---
export const searchStudents = (search = '') => api.get(`/admin/students?search=${encodeURIComponent(search)}`).then(res => res.data);
export const updateStudentMealPlan = (id, data) => api.put(`/admin/students/${id}/meal-plan`, data).then(res => res.data);
export const overrideMealPlanCredits = (id, data) => api.post(`/admin/students/${id}/meal-plan/override`, data).then(res => res.data);
export const bulkResetMealPlans = () => api.post('/admin/meal-plans/reset').then(res => res.data);

// --- ORDERS / REFUNDS ---
// (Note: To fetch orders, we can reuse the existing orders service or add an admin-specific one if needed)
export const refundOrder = (id, reason) => api.post(`/admin/orders/${id}/refund`, { reason }).then(res => res.data);
export const setFlashDiscount = (menuItemId, percentage) => api.post('/flash-discounts', { menuItemId, percentage }).then(res => res.data);
export const clearFlashDiscount = (menuItemId) => api.delete(`/flash-discounts/${menuItemId}`).then(res => res.data);
export const getFlashDiscounts = () => api.get('/flash-discounts').then(res => res.data);

// --- SETTINGS / BACKUP RESTORE ---
export const getAdminSettings = () =>
  api.get('/admin/settings').then((res) => res.data.data?.settings ?? {});

export const updateAdminSettings = (settings) =>
  api.put('/admin/settings', settings).then((res) => res.data);

export const createBackup = () =>
  api.post('/admin/settings/backup').then((res) => res.data.data);

export const listBackups = () =>
  api.get('/admin/settings/backups').then((res) => res.data);

export const restoreBackup = (backupId) =>
  api.post(`/admin/settings/restore/${encodeURIComponent(backupId)}`).then((res) => res.data);

