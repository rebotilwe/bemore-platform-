import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

const PUBLIC_PATHS = [
  '/applications/upload',
  '/applications/upload-document',
  '/applications',
  '/applications/lookup',
  '/applications/data-export',
  '/applications/data-delete',
  '/health',
  '/auth/login',
  '/auth/verify',
];

export default function auth(req, res, next) {
  const url = req.originalUrl || req.url;

  if (PUBLIC_PATHS.some(p => url.startsWith(p)) ||
      url.match(/^\/applications\/[^/]+\/attachment\/[^/]+\/signed$/)) {
    console.log(`🔓 AUTH BYPASSED: ${url}`);
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

  // Bypass CSRF for uploads
  if (url.includes('/upload')) {
    console.log(`🔓 CSRF BYPASSED for upload: ${url}`);
    return next();
  }

  if (url.endsWith('/auth/login')) return next();

  const headerToken = req.get('X-CSRF-Token');
  const cookieToken = req.cookies?.bm_csrf;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    console.log(`❌ CSRF BLOCKED: ${url}`);
    return res.status(403).json({ success: false, message: 'Missing or invalid CSRF token' });
  }

  next();
}