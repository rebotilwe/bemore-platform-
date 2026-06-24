import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import applicationsRouter from './applications.js';
import reportsRouter from './reports.js';
import analyticsRouter from './analytics.js';
import settingsRouter from './settings.js';
import trackingRouter from './tracking.js';
import adminsRouter from './admins.js';
import authMiddleware, { csrfProtection } from '../middleware/auth.js';
import { adminLimiter } from '../config/rateLimit.js';
import EmailLog from '../models/EmailLog.js';

const router = Router();

// ── Route mounts ──────────────────────────────────────────────────────────────

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/track', trackingRouter);

// Applications — has a mix of public and admin routes.
// Public routes (/upload, /upload-document, /lookup, POST /) are unauthenticated.
// Admin routes inside applicationsRouter already apply authGuard individually,
// so we do NOT add a blanket authMiddleware here — doing so would block the
// public upload endpoints.
router.use('/applications', applicationsRouter);

// These routers are fully admin-only, so blanket auth is correct here.
router.use('/reports',   authMiddleware, csrfProtection, reportsRouter);
router.use('/analytics', authMiddleware, csrfProtection, analyticsRouter);
router.use('/insights',  authMiddleware, csrfProtection, analyticsRouter);
router.use('/settings',  authMiddleware, csrfProtection, settingsRouter);
router.use('/admins',    authMiddleware, csrfProtection, adminsRouter);

// ── Email logs (admin) ────────────────────────────────────────────────────────
// Validate refNumber format to prevent NoSQL injection.
router.get(
  '/emails/:refNumber',
  authMiddleware,
  csrfProtection,
  adminLimiter,
  async (req, res) => {
    const ref = req.params.refNumber;
    if (typeof ref !== 'string' || !/^BM-[A-Z0-9]{4,12}$/.test(ref)) {
      return res.status(400).json({ success: false, message: 'Invalid reference number format' });
    }
    const logs = await EmailLog.find({ refNumber: ref }).sort({ sentAt: -1 }).limit(50).lean();
    res.json({ success: true, data: logs });
  },
);

export default router;