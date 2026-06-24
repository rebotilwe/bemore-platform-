import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { publicApplicationLimiter, adminLimiter } from '../config/rateLimit.js';
import { APPLICATION_STATUSES } from '../constants/enums.js';
import {
  submit, list, getOne, update, stats, exportCsv, bulkUpdateStatus, sendReminders,
  uploadCv, uploadDocument, downloadAttachment, deleteAttachment, downloadSignedAttachment,
  bulkAssignDepartment, getRoutingStats, lookupStatus, exportMyData, deleteMyData,
} from '../controllers/applicationController.js';
import { singleCvUploadMiddleware, multiUploadMiddleware } from '../services/uploadService.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// PUBLIC ROUTES — NO AUTH, NO CSRF
// Must come before any /:param wildcards
// ──────────────────────────────────────────────────────────────

router.post('/', publicApplicationLimiter, submit);

router.post('/upload', publicApplicationLimiter, singleCvUploadMiddleware, uploadCv);

router.post('/upload-document',
  publicApplicationLimiter,
  multiUploadMiddleware,
  uploadDocument
);

router.post('/lookup',
  publicApplicationLimiter,
  body('refNumber').notEmpty().withMessage('Reference number required'),
  body('email').isEmail().withMessage('Valid email required'),
  validate,
  lookupStatus,
);

router.post('/data-export',
  publicApplicationLimiter,
  body('refNumber').notEmpty(),
  body('email').isEmail(),
  validate,
  exportMyData,
);

router.post('/data-delete',
  publicApplicationLimiter,
  body('refNumber').notEmpty(),
  body('email').isEmail(),
  body('confirm').equals('DELETE').withMessage('Must confirm deletion'),
  validate,
  deleteMyData,
);

// Signed attachment — public, must be before /:refNumber/attachment/:storedAs
router.get('/:refNumber/attachment/:storedAs/signed',
  publicApplicationLimiter,
  downloadSignedAttachment
);

// ──────────────────────────────────────────────────────────────
// ADMIN ROUTES — specific paths BEFORE wildcards
// ──────────────────────────────────────────────────────────────

// Static GET paths first
router.get('/stats', adminLimiter, auth, stats);
router.get('/export/csv', adminLimiter, auth, exportCsv);
router.get('/routing-stats', adminLimiter, auth, getRoutingStats);

// Static POST paths
router.post('/bulk-status', adminLimiter, auth, bulkUpdateStatus);
router.post('/bulk-department', adminLimiter, auth, bulkAssignDepartment);
router.post('/send-reminders', adminLimiter, auth, sendReminders);

// List — no wildcard
router.get('/', adminLimiter, auth, list);

// Attachment routes before /:id
router.get('/:refNumber/attachment/:storedAs', adminLimiter, auth, downloadAttachment);
router.delete('/:refNumber/attachment/:storedAs', adminLimiter, auth, deleteAttachment);

// /:id LAST — catches anything not matched above
router.get('/:id', adminLimiter, auth, getOne);
router.patch('/:id', adminLimiter, auth, update);

export default router;