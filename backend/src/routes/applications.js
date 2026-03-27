import { Router } from 'express';
import { body, query, param } from 'express-validator';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { PROFILE_CATEGORIES, APPLICATION_STATUSES, SORTABLE_FIELDS } from '../constants/enums.js';
import { submit, list, getOne, update, stats, exportCsv, bulkUpdateStatus } from '../controllers/applicationController.js';

const router = Router();

// ── Public ──
router.post('/',
  body('userType').isIn(PROFILE_CATEGORIES).withMessage('Invalid profile category'),
  body('personal').isObject().withMessage('Personal info required'),
  body('personal.firstName').notEmpty().withMessage('First name required'),
  body('personal.surname').notEmpty().withMessage('Surname required'),
  body('personal.email').isEmail().withMessage('Valid email required'),
  body('personal.phone').notEmpty().withMessage('Phone required'),
  validate,
  submit,
);

// ── Admin (order matters: static routes before :id) ──
router.get('/stats', auth, stats);
router.get('/export/csv', auth, exportCsv);
router.post('/bulk-status', auth, bulkUpdateStatus);

router.get('/',
  auth,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('userType').optional().isIn([...PROFILE_CATEGORIES, 'all']).withMessage('Invalid userType'),
  query('status').optional().isIn([...APPLICATION_STATUSES, 'all']).withMessage('Invalid status'),
  query('sortBy').optional().isIn(SORTABLE_FIELDS).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  validate,
  list,
);

router.get('/:id',
  auth,
  param('id').isMongoId().withMessage('Invalid application ID'),
  validate,
  getOne,
);

router.patch('/:id',
  auth,
  param('id').isMongoId().withMessage('Invalid application ID'),
  validate,
  update,
);

export default router;
