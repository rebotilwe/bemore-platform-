import { Router } from 'express';
import { body, query, param } from 'express-validator';
import validator from 'validator';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { publicApplicationLimiter, adminLimiter } from '../config/rateLimit.js';
import { PROFILE_CATEGORIES, APPLICATION_STATUSES, SORTABLE_FIELDS, FUNDER_NAMES } from '../constants/enums.js';
import {
  submit, list, getOne, update, stats, exportCsv, bulkUpdateStatus, sendReminders,
  uploadCv, uploadDocument, downloadAttachment, deleteAttachment, downloadSignedAttachment,
  bulkAssignDepartment, getRoutingStats,
} from '../controllers/applicationController.js';
import { singleCvUploadMiddleware, multiUploadMiddleware } from '../services/uploadService.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// PUBLIC ROUTES — NO AUTH, NO CSRF
// ──────────────────────────────────────────────────────────────

router.post('/',
  publicApplicationLimiter,
  // Your validators here...
  submit
);

router.post('/upload',
  publicApplicationLimiter,
  singleCvUploadMiddleware,
  uploadCv
);

router.post('/upload-document',
  publicApplicationLimiter,
  multiUploadMiddleware,
  (req, res, next) => {
    console.log('✅ /upload-document PUBLIC route hit');
    next();
  },
  uploadDocument
);

router.post('/lookup', publicApplicationLimiter, /* validators */, /* handler */);

router.post('/data-export', publicApplicationLimiter, /* ... */);
router.post('/data-delete', publicApplicationLimiter, /* ... */);

router.get('/:refNumber/attachment/:storedAs/signed',
  publicApplicationLimiter,
  downloadSignedAttachment
);

// ──────────────────────────────────────────────────────────────
// ADMIN ROUTES — Require auth + csrf
// ──────────────────────────────────────────────────────────────

router.get('/stats', adminLimiter, auth, stats);
router.get('/export/csv', adminLimiter, auth, exportCsv);
router.get('/routing-stats', adminLimiter, auth, getRoutingStats);

router.post('/bulk-status', adminLimiter, auth, bulkUpdateStatus);
router.post('/bulk-department', adminLimiter, auth, bulkAssignDepartment);
router.post('/send-reminders', adminLimiter, auth, sendReminders);

router.get('/', adminLimiter, auth, list);
router.get('/:id', adminLimiter, auth, getOne);
router.patch('/:id', adminLimiter, auth, update);

router.get('/:refNumber/attachment/:storedAs', adminLimiter, auth, downloadAttachment);
router.delete('/:refNumber/attachment/:storedAs', adminLimiter, auth, deleteAttachment);

export default router;