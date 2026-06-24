import express from 'express';
import { multiUploadMiddleware, finaliseUploads, DOCUMENT_TYPES } from '../services/uploadService.js';

const router = express.Router();

// Upload multiple documents — public, no auth required.
// authGuard removed so the public onboarding form can upload without a session.
router.post('/upload', multiUploadMiddleware, async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, code: 'NO_FILES', message: 'No files uploaded' });
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
 * Public — no auth required.
 * Frontend posts: FormData { file: <File>, field: <string> }
 * Response: { success: true, file: { field, filename, storedAs, size, mimeType, expiryDate } }
 */
router.post('/upload-document', multiUploadMiddleware, async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, code: 'NO_FILE', message: 'No file uploaded' });
    }

    const file = files[0];
    const documentField = req.body?.field || file.fieldname;
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

    return res.status(200).json({
      success: true,
      file: {
        field: result.field,
        filename: result.filename,
        storedAs: result.storedAs,
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

// Get document types — public
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