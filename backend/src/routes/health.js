import { Router } from 'express';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
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

  // SMTP check (non-blocking — degraded not unhealthy)
  if (config.mail.host) {
    try {
      const t = nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.port === 465,
        auth: { user: config.mail.user, pass: config.mail.pass },
      });
      await Promise.race([t.verify(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))]);
      checks.email = 'ok';
      t.close();
    } catch {
      checks.email = 'degraded';
    }
  } else {
    checks.email = 'not configured';
  }

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
