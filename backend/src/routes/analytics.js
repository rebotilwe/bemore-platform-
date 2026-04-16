import { Router } from 'express';
import { query } from 'express-validator';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { adminLimiter } from '../config/rateLimit.js';
import {
  dashboard, funnel, submissionTrends, tagAnalytics,
  demographics, dealRoom, eventLog,
} from '../controllers/analyticsController.js';
import {
  trafficOverview, trafficTrends, trafficReferrers,
  trafficDevices, trafficHours, trafficFormFunnel, trafficClicks,
} from '../controllers/trafficController.js';

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

// ── Traffic analytics ──
router.get('/traffic',
  query('range').optional().isIn(['7d', '30d', '90d', '1y']),
  validate,
  trafficOverview,
);

router.get('/traffic/trends',
  query('granularity').optional().isIn(['day', 'week', 'month']),
  query('range').optional().isIn(['7d', '30d', '90d', '1y']),
  validate,
  trafficTrends,
);

router.get('/traffic/referrers',
  query('range').optional().isIn(['7d', '30d', '90d', '1y']),
  validate,
  trafficReferrers,
);

router.get('/traffic/devices',
  query('range').optional().isIn(['7d', '30d', '90d', '1y']),
  validate,
  trafficDevices,
);

router.get('/traffic/hours',
  query('range').optional().isIn(['7d', '30d', '90d', '1y']),
  validate,
  trafficHours,
);

router.get('/traffic/form-funnel',
  query('range').optional().isIn(['7d', '30d', '90d', '1y']),
  validate,
  trafficFormFunnel,
);

router.get('/traffic/clicks',
  query('range').optional().isIn(['7d', '30d', '90d', '1y']),
  validate,
  trafficClicks,
);

router.get('/events',
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('category').optional().isIn(['application', 'admin', 'auth', 'report', 'system']).withMessage('Invalid category'),
  validate,
  eventLog,
);

export default router;
