import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import applicationsRouter from './applications.js';
import reportsRouter from './reports.js';
import analyticsRouter from './analytics.js';
import pollsRouter from './polls.js';
import settingsRouter from './settings.js';
import trackingRouter from './tracking.js';
import adminsRouter from './admins.js';
import authMiddleware, { csrfProtection } from '../middleware/auth.js';
import { adminLimiter } from '../config/rateLimit.js';
import EmailLog from '../models/EmailLog.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/applications', applicationsRouter);
router.use('/reports', reportsRouter);
router.use('/analytics', analyticsRouter);
router.use('/insights', analyticsRouter);
router.use('/polls', pollsRouter);
router.use('/settings', settingsRouter);
router.use('/track', trackingRouter);
router.use('/admins', adminsRouter);

// CSRF protection for state-changing operations (applied after auth)
// Safe methods (GET, HEAD, OPTIONS) are skipped inside the middleware
router.use('/applications', authMiddleware, csrfProtection);
router.use('/reports', authMiddleware, csrfProtection);
router.use('/analytics', authMiddleware, csrfProtection);
router.use('/insights', authMiddleware, csrfProtection);
router.use('/polls', authMiddleware, csrfProtection);
router.use('/settings', authMiddleware, csrfProtection);
router.use('/admins', authMiddleware, csrfProtection);

// Email logs (admin) — validate refNumber format to prevent NoSQL injection
router.get('/emails/:refNumber', authMiddleware, csrfProtection, adminLimiter, async (req, res) => {
  const ref = req.params.refNumber;
  if (typeof ref !== 'string' || !/^BM-[A-Z0-9]{4,12}$/.test(ref)) {
    return res.status(400).json({ success: false, message: 'Invalid reference number format' });
  }
  const logs = await EmailLog.find({ refNumber: ref }).sort({ sentAt: -1 }).limit(50).lean();
  res.json({ success: true, data: logs });
});

export default router;
