import rateLimit from 'express-rate-limit';

function createLimiter(opts) {
  const { windowMs, max, code, defaultMessage, skipSuccessfulRequests = false } = opts;
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res /*, next */) => {
      const retryAfter = Math.ceil(windowMs / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        code,
        message: defaultMessage,
      });
    },
  });
}

export const generalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  skipSuccessfulRequests: true,
  code: 'TOO_MANY_REQUESTS',
  defaultMessage: 'Too many requests from this IP, please try again after 15 minutes',
});

export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 failed login attempts per window
  skipSuccessfulRequests: true,
  code: 'TOO_MANY_REQUESTS',
  defaultMessage: 'Too many login attempts. Please try again after 15 minutes',
});
