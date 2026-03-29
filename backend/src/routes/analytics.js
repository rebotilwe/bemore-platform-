import { Router } from 'express';
import { query } from 'express-validator';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { adminLimiter } from '../config/rateLimit.js';
import {
  dashboard, funnel, submissionTrends, tagAnalytics,
  demographics, dealRoom, eventLog,
} from '../controllers/analyticsController.js';

const router = Router();

// All analytics endpoints require admin auth + rate limiting
router.use(adminLimiter);
router.use(auth);

router.get('/dashboard',
  query('range').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Range must be 7d, 30d, 90d, or 1y'),
  validate,
  dashboard,
);

router.get('/funnel', funnel);

router.get('/trends',
  query('granularity').optional().isIn(['day', 'week', 'month']).withMessage('Granularity must be day, week, or month'),
  query('range').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Range must be 7d, 30d, 90d, or 1y'),
  validate,
  submissionTrends,
);

router.get('/tags', tagAnalytics);

router.get('/demographics', demographics);

router.get('/deal-room', dealRoom);

router.get('/events',
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('category').optional().isIn(['application', 'admin', 'auth', 'report', 'system']).withMessage('Invalid category'),
  validate,
  eventLog,
);

export default router;
