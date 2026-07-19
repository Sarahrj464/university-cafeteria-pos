import {
  loginUser,
  registerUser,
  getUserById,
  refreshAccessToken,
  logoutUser,
} from '../services/auth.service.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  maxAge: env.refreshTokenMaxAge,
  path: '/api/auth',
};

function sendAuthSuccess(res, { accessToken, refreshToken, user }, message) {
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({
    success: true,
    message,
    data: { accessToken, user },
  });
}

export async function register(req, res, next) {
  try {
    const { name, email, password, role, studentId, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        code: 'PASSWORD_MISMATCH',
        message: 'Passwords do not match',
      });
    }

    const result = await registerUser({ name, email, password, role, studentId });
    sendAuthSuccess(res, result, 'Account created successfully');
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    sendAuthSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const refreshToken = req.cookies?.refreshToken;

    logoutUser(accessToken, refreshToken);

    res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await getUserById(req.user.userId);

    res.json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Refresh token not found',
      });
    }

    const result = await refreshAccessToken(refreshToken);

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (err) {
    next(err);
  }
}
