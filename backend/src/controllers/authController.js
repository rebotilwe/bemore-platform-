import { authenticateAdmin } from '../services/authService.js';
import { track } from '../services/analyticsService.js';

export async function login(req, res, next) {
  try {
    const result = await authenticateAdmin(req.body.email, req.body.password);
    if (!result) {
      track('auth.login_failed', 'auth', {
        meta: { email: req.body.email },
        req,
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    track('auth.login', 'auth', {
      actor: { type: 'admin', email: req.body.email },
      req,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export function verify(_req, res) {
  res.json({ success: true });
}
