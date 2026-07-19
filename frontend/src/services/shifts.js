import api from './api';

function unwrapNested(data, path, fallback) {
  // path like: ['data','shift']
  let cur = data;
  for (const key of path) cur = cur?.[key];
  return cur ?? fallback;
}

function ensureNonNull(value, name) {
  if (value === null || value === undefined) {
    throw new Error(`${name} missing in API response`);
  }
  return value;
}

export async function getActiveShift() {
  const { data } = await api.get('/shifts/active');
  const inner = unwrapNested(data, ['data'], {});
  const isActive = !!inner.active;
  return isActive ? ensureNonNull(inner.shift, 'shift') : null;
}

export async function openShift(openingCash) {
  const { data } = await api.post('/shifts/open', { openingCash });
  const shift = unwrapNested(data, ['data', 'shift'], null);
  return ensureNonNull(shift, 'shift');
}

export async function closeShift(id, closingCash) {
  const { data } = await api.put(`/shifts/${id}/close`, { closingCash });
  const shift = unwrapNested(data, ['data', 'shift'], null);
  return ensureNonNull(shift, 'shift');
}

export async function getShiftSummary(id) {
  const { data } = await api.get(`/shifts/${id}/summary`);
  const summary = unwrapNested(data, ['data', 'summary'], null);
  return ensureNonNull(summary, 'summary');
}

export async function fetchShifts(params) {
  const { data } = await api.get('/shifts', { params });
  const shifts = unwrapNested(data, ['data', 'shifts'], []);
  return Array.isArray(shifts) ? shifts : [];
}
