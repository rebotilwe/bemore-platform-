/**
 * Upload service — multipart parsing, filename sanitisation, disk persistence.
 *
 * Spec: 2026-05-11 onboarding flow update §8.1.
 *
 * Storage layout: ${UPLOAD_DIR}/cv/{uuid}.{ext}
 * UPLOAD_DIR defaults to ./uploads (relative to backend cwd) for local dev.
 * Railway production sets UPLOAD_DIR=/app/uploads (persistent volume mount).
 */
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import logger from '../utils/logger.js';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
export const CV_DIR = path.join(UPLOAD_DIR, 'cv');
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
export const ALLOWED_ATTACHMENT_FIELDS = new Set(['cv']);

// Map MIME → canonical extension (used when original filename has none).
const MIME_TO_EXT = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

/** Best-effort, idempotent dir bootstrap. Logged + ignored if it fails (read-only fs in tests). */
export function ensureUploadDirs() {
  try {
    fs.mkdirSync(CV_DIR, { recursive: true, mode: 0o755 });
  } catch (err) {
    logger.warn('Failed to create upload dir', { dir: CV_DIR, error: err.message });
  }
}

/**
 * Sanitise an original filename to `[a-zA-Z0-9 ._-]` and strip path segments.
 * Returns a safe display string. May be empty if input was all junk.
 */
export function sanitizeFilename(original) {
  if (typeof original !== 'string' || !original) return '';
  const base = path.basename(original);
  const cleaned = base.replace(/[^a-zA-Z0-9 ._-]/g, '');
  return cleaned.slice(0, 200); // cap defensively
}

/** Returns the dot-prefixed extension (lowercase) inferred from filename or MIME. */
export function pickExtension(originalName, mimeType) {
  const fromName = path.extname(originalName || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
  if (fromName && fromName.length <= 6) return fromName;
  const fromMime = MIME_TO_EXT[mimeType];
  return fromMime ? `.${fromMime}` : '';
}

/** Build the storedAs UUID-based filename: `<uuidv4><.ext>`. */
export function buildStoredName(originalName, mimeType) {
  const ext = pickExtension(originalName, mimeType);
  return `${randomUUID()}${ext}`;
}

// ── Multer config ──
// Keep a single multer instance per process; ensure target dir exists at construction.
ensureUploadDirs();

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    // Re-ensure dir exists in case it was removed between requests.
    try {
      fs.mkdirSync(CV_DIR, { recursive: true, mode: 0o755 });
    } catch (err) {
      return cb(err);
    }
    cb(null, CV_DIR);
  },
  filename(_req, file, cb) {
    cb(null, buildStoredName(file.originalname, file.mimetype));
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const err = new Error('INVALID_MIME_TYPE');
    err.code = 'INVALID_MIME_TYPE';
    return cb(err, false);
  }
  cb(null, true);
}

export const cvUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: 1,
  },
});

/** Express middleware that translates multer errors into our spec error codes. */
export function singleCvUploadMiddleware(req, res, next) {
  const handler = cvUpload.single('file');
  handler(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, code: 'FILE_TOO_LARGE', message: 'File exceeds 5 MB limit' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, code: 'NO_FILE', message: 'Expected a single "file" field' });
      }
      return res.status(400).json({ success: false, code: 'UPLOAD_ERROR', message: err.message });
    }

    if (err.code === 'INVALID_MIME_TYPE') {
      return res.status(400).json({ success: false, code: 'INVALID_MIME_TYPE', message: 'Unsupported file type — PDF or Word only' });
    }

    logger.error('Upload storage error', { error: err.message });
    return res.status(500).json({ success: false, code: 'STORAGE_ERROR', message: 'Could not persist upload' });
  });
}

/**
 * Post-upload finalisation: chmod the file 0o644 and return the response payload.
 * Multer has already streamed the file to disk by this point.
 */
export async function finaliseUpload(file) {
  const safeFilename = sanitizeFilename(file.originalname);
  try {
    await fsp.chmod(file.path, 0o644);
  } catch (err) {
    logger.warn('chmod 0644 failed on upload', { path: file.path, error: err.message });
  }
  return {
    filename: safeFilename || file.filename,
    storedAs: file.filename,
    size: file.size,
    mimeType: file.mimetype,
  };
}

/** Resolve the absolute disk path for a stored CV. Caller is responsible for existence checks. */
export function cvPath(storedAs) {
  // Defence in depth: storedAs must look like a UUID-ish basename, no separators.
  if (typeof storedAs !== 'string' || storedAs.includes('/') || storedAs.includes('\\') || storedAs.includes('..')) {
    return null;
  }
  return path.join(CV_DIR, storedAs);
}

/** Return { exists, size, path } for a stored CV. exists=false if not on disk. */
export async function cvStat(storedAs) {
  const p = cvPath(storedAs);
  if (!p) return { exists: false, path: null, size: 0 };
  try {
    const s = await fsp.stat(p);
    return { exists: true, path: p, size: s.size };
  } catch {
    return { exists: false, path: p, size: 0 };
  }
}

/** Best-effort delete. Returns true on success, false on missing/error. Errors logged. */
export async function deleteCvFile(storedAs) {
  const p = cvPath(storedAs);
  if (!p) return false;
  try {
    await fsp.unlink(p);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    logger.error('Failed to delete CV file', { storedAs, error: err.message });
    return false;
  }
}

/**
 * Infer MIME type from file extension. Used when persisting metadata after upload.
 * Returns 'application/octet-stream' if unknown.
 */
export function mimeFromStoredName(storedAs) {
  const ext = path.extname(storedAs || '').toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.doc': return 'application/msword';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default: return 'application/octet-stream';
  }
}
