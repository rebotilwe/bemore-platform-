import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

const PUBLIC_PATHS = [
  '/api/applications/upload',
  '/api/applications/upload-document',
  '/api/applications',
  '/api/applications/lookup',
  '/api/applications/data-export',
  '/api/applications/data-delete',
  '/api/health',
  '/api/auth/login',
  '/api/auth/verify',
];

export default function auth(req, res, next) {
  const url = req.originalUrl || req.url;

  if (url.startsWith('/api/applications/') ||
      PUBLIC_PATHS.some(p => url.startsWith(p)) ||
      url.match(/^\/api\/applications\/[^/]+\/attachment\/[^/]+\/signed$/)) {
    return next();
  }

  const token = req.cookies?.bm_token ||
    (req.get('Authorization')?.startsWith('Bearer ') && req.get('Authorization').slice(7));

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    req.admin = jwt.verify(token, config.jwtSecret);
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

export function csrfProtection(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return next();

  const url = req.originalUrl || req.url;

  if (url.includes('/api/applications/upload') || url.includes('/api/auth/login')) {
    return next();
  }

  const headerToken = req.get('X-CSRF-Token');
  const cookieToken = req.cookies?.bm_csrf;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ success: false, message: 'Missing or invalid CSRF token' });
  }

  next();
}
