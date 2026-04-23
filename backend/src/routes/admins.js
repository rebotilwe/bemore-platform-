import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { adminLimiter } from '../config/rateLimit.js';
import { listAdmins, createAdmin, updateAdmin, deleteAdmin } from '../controllers/adminController.js';

const router = Router();

// All routes require admin auth
router.use(adminLimiter, auth);

// List all admins
router.get('/', listAdmins);

// Create new admin
router.post('/',
  body('email').isEmail().withMessage('Valid email required').isLength({ max: 254 }),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').optional().isString().isLength({ max: 100 }),
  validate,
  createAdmin,
);

// Update admin (name, email, password)
router.patch('/:id',
  param('id').isMongoId().withMessage('Invalid admin ID'),
  body('email').optional().isEmail().withMessage('Valid email required').isLength({ max: 254 }),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').optional().isString().isLength({ max: 100 }),
  validate,
  updateAdmin,
);

// Delete admin
router.delete('/:id',
  param('id').isMongoId().withMessage('Invalid admin ID'),
  validate,
  deleteAdmin,
);

export default router;
