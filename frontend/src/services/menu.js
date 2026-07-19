import api from './api';

export async function fetchCategories() {
  const { data } = await api.get('/categories');
  return data.data.categories;
}

export async function fetchMenuItems({ category, search, available } = {}) {
  const params = {};
  if (category && category !== 'all') params.category = category;
  if (search) params.search = search;
  if (available !== undefined) params.available = available;
  const { data } = await api.get('/menu-items', { params });
  return data.data.items;
}

export async function fetchMenuItem(id) {
  const { data } = await api.get(`/menu-items/${id}`);
  return data.data.item;
}
