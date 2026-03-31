import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import applicationsRouter from './applications.js';
import reportsRouter from './reports.js';
import analyticsRouter from './analytics.js';
import pollsRouter from './polls.js';
import settingsRouter from './settings.js';
import authMiddleware from '../middleware/auth.js';
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

// Email logs (admin)
router.get('/emails/:refNumber', adminLimiter, authMiddleware, async (req, res) => {
  const logs = await EmailLog.find({ refNumber: req.params.refNumber }).sort({ sentAt: -1 }).limit(50).lean();
  res.json({ success: true, data: logs });
});

export default router;
