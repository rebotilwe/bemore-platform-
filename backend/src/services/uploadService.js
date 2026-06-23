/**
 * Upload service — multipart parsing, filename sanitisation, disk persistence.
 *
 * Spec: 2026-05-11 onboarding flow update §8.1.
 *
 * Storage layout: ${UPLOAD_DIR}/{document_type}/{uuid}.{ext}
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
export const DOCS_DIR = path.join(UPLOAD_DIR, 'documents');
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

// Common allowed MIME types across all document types
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);

// Allowed attachment fields (multiple document types)
export const ALLOWED_ATTACHMENT_FIELDS = new Set([
  'cv',
  'company_registration',
  'tax_clearance',
  'bee_certificate',
  'professional_indemnity',
]);

// Map MIME → canonical extension
const MIME_TO_EXT = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

// Document type configurations with expiry tracking
export const DOCUMENT_TYPES = {
  cv: {
    label: 'CV/Resume',
    maxSize: 5 * 1024 * 1024,
    required: false,
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    expiryMonths: null,
    validation: 'Professional CV/Resume',
  },
  company_registration: {
    label: 'Company Registration Certificate',
    maxSize: 5 * 1024 * 1024,
    required: true,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    expiryMonths: 12,
    validation: 'Valid Company Registration Certificate from CIPC',
  },
  tax_clearance: {
    label: 'Tax Clearance Certificate',
    maxSize: 5 * 1024 * 1024,
    required: true,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    expiryMonths: 12,
    validation: 'Valid SARS Tax Clearance Certificate',
  },
  bee_certificate: {
    label: 'B-BBEE Certificate/Affidavit',
    maxSize: 5 * 1024 * 1024,
    required: true,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    expiryMonths: 12,
    validation: 'Current B-BBEE Certificate or Sworn Affidavit',
  },
  professional_indemnity: {
    label: 'Professional Indemnity Insurance',
    maxSize: 5 * 1024 * 1024,
    required: true,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    expiryMonths: 12,
    validation: 'Valid Professional Indemnity Insurance Certificate',
  },
};

/**
 * Get the subdirectory for a document field.
 * cv → ./uploads/cv/
 * everything else → ./uploads/documents/
 */
export function getDocumentDir(field) {
  if (field === 'cv') return CV_DIR;
  return DOCS_DIR;
}

/**
 * Ensure all upload directories exist.
 */
export function ensureUploadDirs() {
  try {
    fs.mkdirSync(CV_DIR, { recursive: true, mode: 0o755 });
    fs.mkdirSync(DOCS_DIR, { recursive: true, mode: 0o755 });
  } catch (err) {
    logger.warn('Failed to create upload dirs', { error: err.message });
  }
}

// Initialise directories on module load.
ensureUploadDirs();

/**
 * Sanitise an original filename supplied by the browser.
 */
export function sanitizeFilename(original) {
  if (typeof original !== 'string' || !original) return '';
  const base = path.basename(original);
  const cleaned = base.replace(/[^a-zA-Z0-9 ._-]/g, '');
  return cleaned.slice(0, 200);
}

/**
 * Returns the dot-prefixed extension (lowercase) inferred from filename or MIME.
 */
export function pickExtension(originalName, mimeType) {
  const fromName = path.extname(originalName || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
  if (fromName && fromName.length <= 6) return fromName;
  const fromMime = MIME_TO_EXT[mimeType];
  return fromMime ? `.${fromMime}` : '';
}

/**
 * Build the storedAs UUID-based filename: `<uuidv4><.ext>`.
 */
export function buildStoredName(originalName, mimeType) {
  const ext = pickExtension(originalName, mimeType);
  return `${randomUUID()}${ext}`;
}

/**
 * Calculate expiry date based on document type.
 */
export function calculateExpiryDate(field) {
  const docType = DOCUMENT_TYPES[field];
  if (!docType || !docType.expiryMonths) return null;
  const now = new Date();
  now.setMonth(now.getMonth() + docType.expiryMonths);
  return now;
}

/**
 * Validate a multer file object against field-specific requirements.
 */
export function validateDocument(field, file) {
  const docType = DOCUMENT_TYPES[field];
  if (!docType) return { valid: false, error: 'Invalid document type' };

  if (file.size > docType.maxSize) {
    return { valid: false, error: `File exceeds ${docType.maxSize / (1024 * 1024)}MB limit` };
  }
  if (!docType.allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Unsupported file type for ${docType.label}. Allowed: ${docType.allowedMimeTypes.join(', ')}`,
    };
  }
  return { valid: true };
}

// ── Multer config ──────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination(_req, file, cb) {
    const dir = getDocumentDir(file.fieldname);
    try {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    } catch (err) {
      return cb(err);
    }
    cb(null, dir);
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

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_BYTES, files: 10 },
});

/**
 * Express middleware — accepts any number of files across any field names.
 */
export function multiUploadMiddleware(req, res, next) {
  upload.any()(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, code: 'FILE_TOO_LARGE', message: 'File exceeds 5 MB limit' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ success: false, code: 'NO_FILE', message: 'Expected file field' });
        }
        return res.status(400).json({ success: false, code: 'UPLOAD_ERROR', message: err.message });
      }
      if (err.code === 'INVALID_MIME_TYPE') {
        return res.status(400).json({ success: false, code: 'INVALID_MIME_TYPE', message: 'Unsupported file type' });
      }
      logger.error('Upload storage error', { error: err.message });
      return res.status(500).json({ success: false, code: 'STORAGE_ERROR', message: 'Could not persist upload' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, code: 'NO_FILE', message: 'No file uploaded' });
    }

    logger.info('Files uploaded', {
      files: req.files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname, size: f.size })),
    });

    next();
  });
}

/** Legacy alias. */
export const singleCvUploadMiddleware = multiUploadMiddleware;

/**
 * Post-upload finalisation: validate + chmod each uploaded file.
 */
export async function finaliseUploads(files) {
  const results = [];
  const fileArray = Array.isArray(files) ? files : [files];

  for (const file of fileArray) {
    const field = file.fieldname;
    const docType = DOCUMENT_TYPES[field];

    if (!docType) {
      await fsp.unlink(file.path).catch(() => {});
      results.push({ field, filename: sanitizeFilename(file.originalname), size: file.size, mimeType: file.mimetype, valid: false, error: 'Unknown document type' });
      continue;
    }

    const validation = validateDocument(field, file);
    if (!validation.valid) {
      await fsp.unlink(file.path).catch(() => {});
      results.push({ field, filename: sanitizeFilename(file.originalname), size: file.size, mimeType: file.mimetype, valid: false, error: validation.error });
      continue;
    }

    try {
      await fsp.chmod(file.path, 0o644);
    } catch (err) {
      logger.warn('chmod 0644 failed on upload', { path: file.path, error: err.message });
    }

    results.push({
      field,
      filename: sanitizeFilename(file.originalname) || file.filename,
      storedAs: file.filename,
      size: file.size,
      mimeType: file.mimetype,
      valid: true,
      expiryDate: calculateExpiryDate(field),
      required: docType.required || false,
      documentLabel: docType.label || field,
    });
  }

  return results;
}

/** Single-file finalisation (legacy CV support). */
export async function finaliseUpload(file) {
  const results = await finaliseUploads([file]);
  const result = results[0] || null;
  if (result && !result.storedAs) {
    result.storedAs = result.filename || file.filename;
  }
  return result;
}

// ── File path / stat helpers ───────────────────────────────────────────────────

/**
 * Resolve the absolute disk path for a stored file.
 * Returns null if storedAs looks like a path traversal attempt.
 */
export function getFilePath(storedAs, field = 'cv') {
  if (
    typeof storedAs !== 'string' ||
    storedAs.includes('/') ||
    storedAs.includes('\\') ||
    storedAs.includes('..')
  ) {
    return null;
  }
  return path.join(getDocumentDir(field), storedAs);
}

/**
 * Return existence + size for a stored file, looking in the correct
 * subdirectory for the given field.
 */
export async function getFileStat(storedAs, field = 'cv') {
  const p = getFilePath(storedAs, field);
  if (!p) return { exists: false, path: null, size: 0 };
  try {
    const s = await fsp.stat(p);
    return { exists: true, path: p, size: s.size };
  } catch {
    return { exists: false, path: p, size: 0 };
  }
}

/**
 * Get file stats from the correct directory for a given field type.
 * Used by applicationService.resolveAttachments instead of cvStat.
 */
export async function getDocumentStat(storedAs, field) {
  return getFileStat(storedAs, field);
}

/**
 * Delete a stored file. Returns true on success, false if missing/error.
 */
export async function deleteFile(storedAs, field = 'cv') {
  const p = getFilePath(storedAs, field);
  if (!p) return false;
  try {
    await fsp.unlink(p);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    logger.error('Failed to delete file', { storedAs, field, error: err.message });
    return false;
  }
}

/**
 * Infer MIME type from stored filename extension.
 */
export function mimeFromStoredName(storedAs) {
  if (!storedAs) return 'application/octet-stream';
  const ext = path.extname(storedAs).toLowerCase();
  const mimeMap = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

// ── Legacy exports (backward compatibility) ───────────────────────────────────

export async function cvStat(storedAs) {
  return getFileStat(storedAs, 'cv');
}

export async function deleteCvFile(storedAs) {
  return deleteFile(storedAs, 'cv');
}

export function cvPath(storedAs) {
  return getFilePath(storedAs, 'cv');
}