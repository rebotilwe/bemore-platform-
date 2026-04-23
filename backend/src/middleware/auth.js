import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

// Read JWT from HttpOnly cookie (bm_token)
export default function auth(req, res, next) {
  const token = req.cookies?.bm_token;
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

  const cookieToken = req.cookies?.bm_csrf;
  const headerToken = req.get('X-CSRF-Token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ success: false, message: 'Invalid CSRF token' });
  }

  next();
}
