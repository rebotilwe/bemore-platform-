import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import authMiddleware from '../middleware/auth.js';
import { login, verify } from '../controllers/authController.js';

const router = Router();

router.post('/login',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required'),
  validate,
  login,
);

router.get('/verify', authMiddleware, verify);

export default router;
