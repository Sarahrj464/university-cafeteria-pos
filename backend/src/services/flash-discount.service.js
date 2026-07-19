const flashDiscounts = new Map();

export function setFlashDiscount(menuItemId, percentage) {
  const normalized = Number(percentage);
  if (!menuItemId || Number.isNaN(normalized) || normalized <= 0 || normalized >= 100) {
    throw new Error('Invalid flash discount');
  }

  flashDiscounts.set(String(menuItemId), normalized);
  console.log('[flash-discount] set', { menuItemId, percentage: normalized });
  return normalized;
}

export function getFlashDiscount(menuItemId) {
  if (!menuItemId) return null;
  const value = flashDiscounts.get(String(menuItemId));
  return value == null ? null : value;
}

export function clearFlashDiscount(menuItemId) {
  flashDiscounts.delete(String(menuItemId));
  console.log('[flash-discount] cleared', { menuItemId });
}

export function listFlashDiscounts() {
  return Array.from(flashDiscounts.entries()).map(([menuItemId, percentage]) => ({ menuItemId, percentage }));
}
