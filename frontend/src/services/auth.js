import api from './api';
import { getRoleRedirectPath } from '../utils/storage';

export async function loginRequest(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  return data.data;
}

export async function registerRequest(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data.data;
}

export async function logoutRequest() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Clear local state even if server logout fails
  }
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data.data.user;
}

export async function refreshTokenRequest() {
  const { data } = await api.post('/auth/refresh');
  return data.data;
}

export { getRoleRedirectPath };
