import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

// Public paths that should NEVER require authentication
const PUBLIC_PATHS = [
  '/applications/upload',
  '/applications/upload-document',
  '/applications/lookup',
  '/applications/data-export',
  '/applications/data-delete',
  '/applications',                    // POST submit
  '/health',
  '/auth/login',
  '/auth/verify',
];

export default function auth(req, res, next) {
  // Skip auth for public paths
  const isPublic = PUBLIC_PATHS.some(path => 
    req.originalUrl.startsWith(path) || 
    req.originalUrl === path
  );

  if (isPublic) {
    return next();
  }

  // Read token from cookie or Authorization header
  const token = req.cookies?.bm_token ||
    (req.get('Authorization')?.startsWith('Bearer ') && req.get('Authorization').slice(7));

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    req.admin = jwt.verify(token, config.jwtSecret);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// CSRF protection (unchanged but improved)
export function csrfProtection(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return next();

  // Skip login and public upload routes
  if (req.originalUrl.endsWith('/auth/login') || 
      req.originalUrl.includes('/upload')) {
    return next();
  }

  const headerToken = req.get('X-CSRF-Token');
  const cookieToken = req.cookies?.bm_csrf;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token' });
  }

  next();
}