import { Router } from 'express';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { healthLimiter } from '../config/rateLimit.js';
import { config } from '../config/index.js';

const router = Router();

// Cache SMTP check result for 60 seconds
let smtpCache = { status: null, checkedAt: 0 };
const SMTP_CACHE_TTL = 60_000;

async function checkSmtp() {
  if (Date.now() - smtpCache.checkedAt < SMTP_CACHE_TTL) return smtpCache.status;

  if (!config.mail.host) {
    smtpCache = { status: 'not configured', checkedAt: Date.now() };
    return smtpCache.status;
  }

  try {
    const t = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.port === 465,
      auth: { user: config.mail.user, pass: config.mail.pass },
      tls: { rejectUnauthorized: false },
    });
    await Promise.race([t.verify(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))]);
    t.close();
    smtpCache = { status: 'ok', checkedAt: Date.now() };
  } catch {
    smtpCache = { status: 'degraded', checkedAt: Date.now() };
  }

  return smtpCache.status;
}

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

  // SMTP check (cached, non-blocking — degraded not unhealthy)
  checks.email = await checkSmtp();

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
