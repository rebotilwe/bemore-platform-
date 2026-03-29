import { Router } from 'express';
import mongoose from 'mongoose';
import { healthLimiter } from '../config/rateLimit.js';

const router = Router();

router.get('/', healthLimiter, async (_req, res) => {
  const checks = {};
  let healthy = true;

  // MongoDB check
  try {
    const state = mongoose.connection.readyState;
    if (state === 1) {
      await mongoose.connection.db.admin().ping();
      checks.database = 'ok';
    } else {
      checks.database = 'disconnected';
      healthy = false;
    }
  } catch (err) {
    checks.database = 'error';
    healthy = false;
  }

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? 'BeMore API running' : 'Service degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
