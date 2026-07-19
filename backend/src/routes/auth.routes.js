import { Router } from 'express';
import { login, logout, me, refresh, register } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { loginSchema, registerSchema } from '../utils/joi.schemas.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', loginLimiter, validateBody(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.post('/refresh', refresh);

export default router;
