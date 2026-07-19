import axios from 'axios';
import {
  getStoredToken,
  clearAuthStorage,
  setAuthStorage,
  getStoredUser,
} from '../utils/storage';
import { parseApiError } from '../utils/authErrors';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

function handleLogout() {
  clearAuthStorage();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

function shouldAttemptRefresh(status, message) {
  if (status !== 401 && status !== 403) return false;
  const normalized = message?.toLowerCase() || '';
  return [
    'authentication required',
    'invalid or expired token',
    'token has been revoked',
    'refresh token expired or invalid',
    'token',
  ].some((fragment) => normalized.includes(fragment));
}

const AUTH_PUBLIC_ROUTES = ['/auth/login', '/auth/register'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { code, message } = parseApiError(error);
    error.authCode = code;
    error.authMessage = message;

    const originalRequest = error.config;
    const isPublicAuthRoute = AUTH_PUBLIC_ROUTES.some((route) =>
      originalRequest?.url?.includes(route)
    );

    const shouldNetworkRetry =
      !originalRequest?._retryNetwork &&
      !error.response &&
      (originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh'));


    const shouldRefresh = !originalRequest?._retry && !isPublicAuthRoute && shouldAttemptRefresh(error.response?.status, message);


    if (shouldNetworkRetry) {
      originalRequest._retryNetwork = true;
      await new Promise((r) => setTimeout(r, 500));
      return api(originalRequest);
    }

    if (shouldRefresh) {

      if (originalRequest.url?.includes('/auth/refresh')) {
        handleLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        const { accessToken, user } = data.data;
        setAuthStorage(accessToken, user || getStoredUser());
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
