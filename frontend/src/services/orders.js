import api from './api';

export async function createOrder(orderData) {
  const { data } = await api.post('/orders', orderData);
  return data.data.order;
}

export async function fetchOrder(id) {
  const { data } = await api.get(`/orders/${id}`);
  return data.data.order;
}

export async function fetchOrders({ status, showCancelled } = {}, { signal } = {}) {
  const params = { limit: 500 };
  if (status && status !== 'all') {
    params.status = status;
  }
  if (showCancelled !== undefined) {
    params.showCancelled = showCancelled;
  }
  const { data } = await api.get('/orders', { params, signal });
  return data.data.orders;
}

export async function fetchKitchenOrders(status, { signal } = {}) {
  const params = { limit: 500 };
  if (status && status !== 'all') {
    params.status = status;
  } else {
    params.status = 'all';
  }
  const { data } = await api.get('/orders', { params, signal });
  return data.data.orders;
}

export async function fetchDisplayOrders() {
  const { data } = await api.get('/orders/display');
  return data.data.orders;
}

export async function updateOrderStatus(id, status) {
  const { data } = await api.put(`/orders/${id}/status`, { status });
  return data.data.order;
}

export async function emailReceipt(orderId, email, receiptHtml) {
  const { data } = await api.post(`/orders/${orderId}/receipt`, { email, receiptHtml });
  return data;
}
