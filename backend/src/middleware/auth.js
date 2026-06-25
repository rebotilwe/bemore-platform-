import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

// Full paths including /api prefix
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
  console.log(`🔐 AUTH CHECK: ${req.method} ${url}`);

  // ✅ BYPASS ALL /api/applications/* routes
  if (url.startsWith('/api/applications/')) {
    console.log(`🔓 AUTH BYPASSED (all applications routes): ${url}`);
    return next();
  }

  const isPublic = PUBLIC_PATHS.some(p => url.startsWith(p)) ||
                   url.match(/^\/api\/applications\/[^/]+\/attachment\/[^/]+\/signed$/);

  if (isPublic) {
    console.log(`🔓 AUTH BYPASSED (public path): ${url}`);
    return next();
  }

  const token = req.cookies?.bm_token ||
    (req.get('Authorization')?.startsWith('Bearer ') && req.get('Authorization').slice(7));

  if (!token) {
    console.log(`❌ No token for protected route: ${url}`);
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

  if (url.includes('/auth/login')) return next();

  const headerToken = req.get('X-CSRF-Token');
  const cookieToken = req.cookies?.bm_csrf;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    console.log(`❌ CSRF FAILED for ${url} | Header: ${headerToken}, Cookie: ${cookieToken}`);
    return res.status(403).json({ success: false, message: 'Missing or invalid CSRF token' });
  }

  next();
}