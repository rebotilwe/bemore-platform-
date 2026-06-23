import express from 'express';
import { multiUploadMiddleware, finaliseUploads, DOCUMENT_TYPES } from '../services/uploadService.js';
import { authGuard } from '../middleware/auth.js';

const router = express.Router();

// Upload multiple documents (for professionals) — used by admin/bulk flows
router.post('/upload', authGuard, multiUploadMiddleware, async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({
        success: false,
        code: 'NO_FILES',
        message: 'No files uploaded',
      });
    }

    const results = await finaliseUploads(files);

    const errors = results.filter(r => !r.valid);
    if (errors.length) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERRORS',
        errors: errors.map(e => ({ field: e.field, message: e.error })),
      });
    }

    return res.status(200).json({
      success: true,
      files: results.map(r => ({
        field: r.field,
        filename: r.filename,
        storedAs: r.storedAs,
        size: r.size,
        mimeType: r.mimeType,
        expiryDate: r.expiryDate,
      })),
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ success: false, code: 'UPLOAD_ERROR', message: 'Failed to process upload' });
  }
});

/**
 * Single-document upload used by the onboarding form (file_group fields).
 * Frontend posts: FormData { file: <File>, field: <string> }
 * Response shape: { success: true, file: { field, filename, storedAs, size, mimeType, expiryDate } }
 * The `storedAs` value is the UUID filename on disk — this is what the backend
 * looks up in resolveAttachments, so it MUST be the server-generated name.
 */
router.post('/upload-document', multiUploadMiddleware, async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, code: 'NO_FILE', message: 'No file uploaded' });
    }

    // multer stores files under their fieldname; the form sends fieldname="file"
    // but also sends a `field` body param indicating the document type.
    const file = files[0];
    const documentField = req.body?.field || file.fieldname;

    // Re-tag the file with the logical document field so finaliseUploads
    // applies the correct DOCUMENT_TYPES config and directory.
    file.fieldname = documentField;

    const results = await finaliseUploads([file]);
    const result = results[0];

    if (!result || !result.valid) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: result?.error || 'File validation failed',
      });
    }

    // Return a single `file` object — frontend reads result.file.storedAs
    return res.status(200).json({
      success: true,
      file: {
        field: result.field,
        filename: result.filename,
        storedAs: result.storedAs,   // ← UUID on disk, e.g. "a3f2c1d4-….pdf"
        size: result.size,
        mimeType: result.mimeType,
        expiryDate: result.expiryDate ?? null,
      },
    });
  } catch (error) {
    console.error('Upload-document error:', error);
    return res.status(500).json({ success: false, code: 'UPLOAD_ERROR', message: 'Failed to process upload' });
  }
});

// Get document types (public — frontend needs this before auth)
router.get('/document-types', (req, res) => {
  const types = Object.entries(DOCUMENT_TYPES).map(([key, config]) => ({
    field: key,
    label: config.label,
    required: config.required,
    expiryMonths: config.expiryMonths,
    validation: config.validation,
  }));
  return res.json({ success: true, types });
});

export default router;