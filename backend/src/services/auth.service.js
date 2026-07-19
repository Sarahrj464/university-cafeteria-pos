import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  blacklistToken,
  blacklistRefreshToken,
  isTokenBlacklisted,
  isRefreshTokenBlacklisted,
} from './token.service.js';
import {
  isValidEmail,
  validatePasswordStrength,
  createAuthError,
} from '../utils/validation.js';

const ALLOWED_REGISTER_ROLES = ['student', 'cashier'];

function buildTokenPayload(user) {
  return {
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  };
}

function formatUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.student_id,
  };
}

export async function registerUser({ name, email, password, role, studentId }) {
  const trimmedName = name?.trim();
  const trimmedEmail = email?.toLowerCase().trim();
  const trimmedStudentId = studentId?.trim() || null;

  if (!trimmedName || !trimmedEmail || !password || !role) {
    throw createAuthError(
      'VALIDATION_ERROR',
      'Name, email, password, and role are required',
      400
    );
  }

  if (!isValidEmail(trimmedEmail)) {
    throw createAuthError('VALIDATION_ERROR', 'Please enter a valid email address', 400);
  }

  if (!ALLOWED_REGISTER_ROLES.includes(role)) {
    throw createAuthError(
      'VALIDATION_ERROR',
      'Registration is only available for Student and Cashier roles',
      400
    );
  }

  if (role === 'student' && !trimmedStudentId) {
    throw createAuthError(
      'VALIDATION_ERROR',
      'Student ID is required for student accounts',
      400
    );
  }

  const { isValid } = validatePasswordStrength(password);
  if (!isValid) {
    throw createAuthError(
      'WEAK_PASSWORD',
      'Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character',
      400
    );
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [trimmedEmail]);
  if (existing.rows.length > 0) {
    throw createAuthError('EMAIL_EXISTS', 'Email already exists', 409);
  }

  if (trimmedStudentId) {
    const existingStudent = await query(
      'SELECT id FROM users WHERE student_id = $1',
      [trimmedStudentId]
    );
    if (existingStudent.rows.length > 0) {
      throw createAuthError('STUDENT_ID_EXISTS', 'Student ID is already registered', 409);
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role, student_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, student_id`,
    [trimmedName, trimmedEmail, passwordHash, role, role === 'student' ? trimmedStudentId : null]
  );

  const user = result.rows[0];

  if (role === 'student') {
    await query(
      `INSERT INTO meal_plans (student_id, plan_type, total_credits, semester, expires_at)
       VALUES ($1, 'dining_dollars', 0, 'Current', NOW() + INTERVAL '120 days')`,
      [user.id]
    );
  }

  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ userId: user.id });

  return {
    accessToken,
    refreshToken,
    user: formatUser(user),
  };
}

export async function loginUser(email, password) {
  if (!email || !password) {
    throw createAuthError('VALIDATION_ERROR', 'Email and password are required', 400);
  }

  const result = await query(
    `SELECT id, name, email, password_hash, role, student_id, is_active
     FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );

  if (result.rows.length === 0) {
    throw createAuthError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw createAuthError(
      'ACCOUNT_DEACTIVATED',
      'Account is deactivated. Contact an administrator.',
      403
    );
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw createAuthError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ userId: user.id });

  return {
    accessToken,
    refreshToken,
    user: formatUser(user),
  };
}

export async function getUserById(userId) {
  const result = await query(
    `SELECT id, name, email, role, student_id, is_active, created_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw createAuthError('ACCOUNT_DEACTIVATED', 'Account is deactivated', 403);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.student_id,
    createdAt: user.created_at,
  };
}

export async function refreshAccessToken(refreshToken) {
  if (!refreshToken || isRefreshTokenBlacklisted(refreshToken)) {
    throw createAuthError('INVALID_TOKEN', 'Invalid refresh token', 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw createAuthError('INVALID_TOKEN', 'Refresh token expired or invalid', 401);
  }

  const user = await getUserById(decoded.userId);
  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken({ userId: user.id });

  blacklistRefreshToken(refreshToken);

  return { accessToken, refreshToken: newRefreshToken, user };
}

export function logoutUser(accessToken, refreshToken) {
  if (accessToken && !isTokenBlacklisted(accessToken)) {
    blacklistToken(accessToken);
  }
  if (refreshToken) {
    blacklistRefreshToken(refreshToken);
  }
}
