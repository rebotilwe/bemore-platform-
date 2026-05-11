import { Router } from 'express';
import mongoose from 'mongoose';
import { healthLimiter } from '../config/rateLimit.js';
import { config } from '../config/index.js';

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
  } catch {
    checks.database = 'error';
    healthy = false;
  }

  // Email — configuration-only check. We don't burn a Resend API call on every
  // health probe; the actual provider health is observable via EmailLog +
  // structured logs when real sends happen. `degraded` is non-fatal.
  checks.email = config.mail.resendApiKey ? 'ok' : 'not configured';

  // Memory usage
  const mem = process.memoryUsage();
  checks.memory = `${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? 'BeMore API running' : 'Service degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
