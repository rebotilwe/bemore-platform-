import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import authMiddleware, { csrfProtection } from '../middleware/auth.js';
import { authLimiter } from '../config/rateLimit.js';
import { login, logout, verify } from '../controllers/authController.js';

const router = Router();

router.post('/login',
  authLimiter,
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required'),
  validate,
  login,
);

router.get('/verify', authMiddleware, verify);

router.post('/logout', authMiddleware, csrfProtection, logout);

export default router;
