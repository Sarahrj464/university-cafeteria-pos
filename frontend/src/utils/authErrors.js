export const AUTH_ERROR_MESSAGES = {
  EMAIL_EXISTS: 'Email already exists',
  STUDENT_ID_EXISTS: 'Student ID is already registered',
  WEAK_PASSWORD:
    'Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character',
  INVALID_CREDENTIALS: 'Invalid email or password',
  PASSWORD_MISMATCH: 'Passwords do not match',
  VALIDATION_ERROR: 'Please check your input and try again',
  ACCOUNT_DEACTIVATED: 'Account is deactivated. Contact an administrator.',
  NETWORK_ERROR: 'Unable to connect to server. Please ensure the backend is running.',
  SERVER_ERROR: 'Something went wrong. Please try again.',
};

export function getAuthErrorMessage(code, fallback) {
  return AUTH_ERROR_MESSAGES[code] || fallback || AUTH_ERROR_MESSAGES.SERVER_ERROR;
}

function extractErrorMessage(payload) {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    const first = payload.errors[0];
    if (typeof first === 'string') return first;
    if (typeof first?.message === 'string' && first.message.trim()) return first.message;
    if (typeof first?.detail === 'string' && first.detail.trim()) return first.detail;
  }

  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }

  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error.trim();
  }

  if (typeof payload?.detail === 'string' && payload.detail.trim()) {
    return payload.detail.trim();
  }

  return '';
}

export function parseApiError(error) {
  if (!error.response) {
    return {
      code: error.authCode || 'NETWORK_ERROR',
      message: error.authMessage || AUTH_ERROR_MESSAGES.NETWORK_ERROR,
    };
  }

  const payload = error.response.data;
  const fallbackMessage = extractErrorMessage(payload);
  const code = payload?.code || error.response?.data?.errorCode || 'SERVER_ERROR';
  const message = fallbackMessage || getAuthErrorMessage(code, fallbackMessage || AUTH_ERROR_MESSAGES.SERVER_ERROR);

  return {
    code,
    message,
  };
}
