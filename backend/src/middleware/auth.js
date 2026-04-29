import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

// Read JWT from cookie (bm_token) or Authorization header (Bearer)
// Supports both: cookies work for same-origin, Bearer works through proxies (Vercel rewrites)
export default function auth(req, res, next) {
  const token = req.cookies?.bm_token
    || (req.get('Authorization')?.startsWith('Bearer ') && req.get('Authorization').slice(7));
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    req.admin = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// CSRF double-submit cookie validation
// Requires bm_csrf cookie to match X-CSRF-Token header
// Skipped for GET, HEAD, OPTIONS, and /auth/login (no token yet)
export function csrfProtection(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip login route — CSRF token not yet set on client
  if (req.originalUrl.endsWith('/auth/login')) {
    return next();
  }

  const headerToken = req.get('X-CSRF-Token');
  if (!headerToken) {
    return res.status(403).json({ success: false, message: 'Missing CSRF token' });
  }

  // Double-submit: cookie must be present AND match header
  const cookieToken = req.cookies?.bm_csrf;
  if (!cookieToken) {
    return res.status(403).json({ success: false, message: 'Missing CSRF cookie' });
  }
  if (cookieToken !== headerToken) {
    return res.status(403).json({ success: false, message: 'Invalid CSRF token' });
  }

  next();
}
