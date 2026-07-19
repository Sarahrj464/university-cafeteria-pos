import { verifyAccessToken, isTokenBlacklisted } from '../services/token.service.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const token = authHeader.slice(7);

  if (isTokenBlacklisted(token)) {
    return res.status(401).json({
      success: false,
      message: 'Token has been revoked',
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.warn(`[auth] ${req.method} ${req.originalUrl} denied: invalid or expired token`, err?.message || err);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}
