import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import validate from '../middleware/validate.js';
import authMiddleware from '../middleware/auth.js';
import { login, verify } from '../controllers/authController.js';

const router = Router();

// Rate limit login attempts: 10 per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

router.post('/login',
  loginLimiter,
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required'),
  validate,
  login,
);

router.get('/verify', authMiddleware, verify);

export default router;
