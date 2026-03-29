import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import applicationsRouter from './applications.js';
import reportsRouter from './reports.js';
import analyticsRouter from './analytics.js';
import pollsRouter from './polls.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/applications', applicationsRouter);
router.use('/reports', reportsRouter);
router.use('/analytics', analyticsRouter);
router.use('/polls', pollsRouter);

export default router;
