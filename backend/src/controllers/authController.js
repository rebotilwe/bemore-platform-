import { authenticateAdmin } from '../services/authService.js';
import { track } from '../services/analyticsService.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import { redactEmail } from '../utils/redactPII.js';
import crypto from 'crypto';

const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

export async function login(req, res, next) {
  try {
    const result = await authenticateAdmin(req.body.email, req.body.password);
    if (!result) {
      track('auth.login_failed', 'auth', {
        meta: { email: req.body.email },
        req,
      });

      await AdminAuditLog.create({
        admin: { id: undefined, email: redactEmail(req.body.email) },
        action: 'login_failed',
        details: { email: redactEmail(req.body.email) },
        ip: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.requestId,
        status: 'failure',
      }).catch(err => console.error('Audit log failed:', err.message));

      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate CSRF token (double-submit cookie pattern)
    const csrfToken = crypto.randomBytes(32).toString('hex');

    // JWT in HttpOnly cookie — not accessible to JavaScript
    res.cookie('bm_token', result.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    // CSRF token in readable cookie — client reads it and sends in header
    res.cookie('bm_csrf', csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
    });

    track('auth.login', 'auth', {
      actor: { type: 'admin', email: req.body.email },
      req,
    });

    await AdminAuditLog.create({
      admin: { id: result.adminId, email: redactEmail(req.body.email) },
      action: 'login',
      details: {},
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => console.error('Audit log failed:', err.message));

    // Return token + CSRF so frontend can use Bearer auth (works through Vercel proxy)
    res.json({ success: true, data: { token: result.token, expiresIn: result.expiresIn, csrfToken } });
  } catch (err) {
    next(err);
  }
}

export function logout(_req, res) {
  res.clearCookie('bm_token');
  res.clearCookie('bm_csrf');
  res.json({ success: true, message: 'Logged out' });
}

export function verify(_req, res) {
  res.json({ success: true });
}
