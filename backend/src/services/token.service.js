import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const tokenBlacklist = new Set();
const refreshTokenBlacklist = new Set();

export function blacklistToken(token) {
  if (token) tokenBlacklist.add(token);
}

export function blacklistRefreshToken(token) {
  if (token) refreshTokenBlacklist.add(token);
}

export function isTokenBlacklisted(token) {
  return tokenBlacklist.has(token);
}

export function isRefreshTokenBlacklisted(token) {
  return refreshTokenBlacklist.has(token);
}

export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.accessTokenExpiry });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.refreshTokenExpiry });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}
