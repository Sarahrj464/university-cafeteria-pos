import dotenv from 'dotenv';

dotenv.config();

const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Warning: ${key} is not set in environment variables`);
  }
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  accessTokenExpiry: '8h',
  refreshTokenExpiry: '7d',
  refreshTokenMaxAge: 7 * 24 * 60 * 60 * 1000,
  // SMTP — optional. If absent, falls back to Ethereal Email (dev test inbox).
  smtpHost: process.env.SMTP_HOST || null,
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || null,
  smtpPass: process.env.SMTP_PASS || null,
  emailUser: process.env.EMAIL_USER || null,
  emailPass: process.env.EMAIL_PASS || null,
  smtpFrom: process.env.SMTP_FROM || '"QuickByte Café POS" <no-reply@quickbytecafe.com>',
};
