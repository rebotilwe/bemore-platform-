import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

// Public routes that bypass BOTH auth and CSRF
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

  const isPublic = PUBLIC_PATHS.some(path => url.startsWith(path)) ||
                   url.match(/^\/applications\/[^/]+\/attachment\/[^/]+\/signed$/);

  if (isPublic) {
    console.log(`🔓 PUBLIC ROUTE BYPASSED: ${url}`);
    return next();
  }

  // Admin routes only
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

  // Skip CSRF for file uploads (critical!)
  if (url.includes('/upload')) {
    console.log(`🔓 CSRF BYPASSED for upload: ${url}`);
    return next();
  }

  const headerToken = req.get('X-CSRF-Token');
  const cookieToken = req.cookies?.bm_csrf;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ 
      success: false, 
      message: 'Missing or invalid CSRF token' 
    });
  }

  next();
}