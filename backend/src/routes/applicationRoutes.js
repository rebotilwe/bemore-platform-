import express from 'express';
import {
  uploadCv,
  uploadDocument,
  submit,
  list,
  getOne,
  update,
  stats,
  exportCsv,
  bulkUpdateStatus,
  bulkAssignDepartment,
  sendReminders,
  downloadAttachment,
  deleteAttachment,
  downloadSignedAttachment,
  getRoutingStats,
} from '../controllers/applicationController.js';
import { authGuard } from '../middleware/auth.js';
import { rateLimiters } from '../config/rateLimiters.js';
import { singleCvUploadMiddleware, multiUploadMiddleware } from '../services/uploadService.js';

const router = express.Router();

// ──────────────────────────────────────────────────────────────
// PUBLIC ROUTES (No auth required)
// ──────────────────────────────────────────────────────────────

// Submit application
router.post('/', rateLimiters.public, submit);

// Upload CV (single file)
router.post('/upload', rateLimiters.public, singleCvUploadMiddleware, uploadCv);

// Upload multi-document (for professionals) - NEW
router.post('/upload-document', rateLimiters.public, multiUploadMiddleware, uploadDocument);

// Download signed attachment (self-service)
router.get('/:refNumber/attachment/:storedAs/signed', rateLimiters.public, downloadSignedAttachment);

// ──────────────────────────────────────────────────────────────
// ADMIN ROUTES (Auth required)
// ──────────────────────────────────────────────────────────────

// List all applications (with filters, search, pagination)
router.get('/', authGuard, rateLimiters.admin, list);

// Get application statistics (dashboard KPIs)
router.get('/stats', authGuard, rateLimiters.admin, stats);

// Export all applications to CSV
router.get('/export/csv', authGuard, rateLimiters.admin, exportCsv);

// Get routing statistics - NEW
router.get('/routing-stats', authGuard, rateLimiters.admin, getRoutingStats);

// Bulk status update (max 100)
router.post('/bulk-status', authGuard, rateLimiters.admin, bulkUpdateStatus);

// Bulk department assignment - NEW (max 100)
router.post('/bulk-department', authGuard, rateLimiters.admin, bulkAssignDepartment);

// Send summit reminders to selected applications (max 100)
router.post('/send-reminders', authGuard, rateLimiters.admin, sendReminders);

// Get single application by ID
router.get('/:id', authGuard, rateLimiters.admin, getOne);

// Update single application (status, classification, notes, etc.)
router.patch('/:id', authGuard, rateLimiters.admin, update);

// Download attachment (admin)
router.get('/:refNumber/attachment/:storedAs', authGuard, rateLimiters.admin, downloadAttachment);

// Delete attachment (admin)
router.delete('/:refNumber/attachment/:storedAs', authGuard, rateLimiters.admin, deleteAttachment);

export default router;