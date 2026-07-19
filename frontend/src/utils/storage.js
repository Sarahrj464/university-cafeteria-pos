const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthStorage(accessToken, user) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getRoleRedirectPath(role) {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'cashier':
      return '/pos';
    case 'kitchen':
      return '/kitchen';
    case 'student':
      return '/student/menu';
    default:
      return '/login';
  }
}
