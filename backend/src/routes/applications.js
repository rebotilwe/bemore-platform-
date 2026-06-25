import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { publicApplicationLimiter, adminLimiter } from '../config/rateLimit.js';
import { APPLICATION_STATUSES } from '../constants/enums.js';
import {
  submit, list, getOne, update, stats, exportCsv, bulkUpdateStatus, sendReminders,
  uploadCv, uploadDocument, downloadAttachment, deleteAttachment, downloadSignedAttachment,
  bulkAssignDepartment, getRoutingStats,
} from '../controllers/applicationController.js';
import { singleCvUploadMiddleware, multiUploadMiddleware } from '../services/uploadService.js';

const router = Router();

router.use((req, res, next) => {
  console.log(`🚨 APP ROUTER: ${req.method} ${req.originalUrl} | url: ${req.url}`);
  next();
});

// ──────────────────────────────────────────────────────────────
// PUBLIC ROUTES — NO AUTH, NO CSRF
// Must come before any /:param wildcards
// ──────────────────────────────────────────────────────────────
router.post('/', publicApplicationLimiter, submit);

router.post('/upload', publicApplicationLimiter, (req, res, next) => {
  singleCvUploadMiddleware(req, res, (err) => {
    if (err) return next(err);
    uploadCv(req, res, next);
  });
});

router.post('/upload-document', publicApplicationLimiter, (req, res, next) => {
  multiUploadMiddleware(req, res, (err) => {
    if (err) return next(err);
    uploadDocument(req, res, next);
  });
});

router.post('/lookup',
  publicApplicationLimiter,
  body('refNumber').notEmpty().withMessage('Reference number required'),
  body('email').isEmail().withMessage('Valid email required'),
  validate,
);

router.post('/data-export',
  publicApplicationLimiter,
  body('refNumber').notEmpty(),
  body('email').isEmail(),
  validate,
);

router.post('/data-delete',
  publicApplicationLimiter,
  body('refNumber').notEmpty(),
  body('email').isEmail(),
  body('confirm').equals('DELETE').withMessage('Must confirm deletion'),
  validate,
);

router.get('/:refNumber/attachment/:storedAs/signed',
  publicApplicationLimiter,
  downloadSignedAttachment,
);

// ──────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ──────────────────────────────────────────────────────────────
router.get('/stats', adminLimiter, auth, stats);
router.get('/export/csv', adminLimiter, auth, exportCsv);
router.get('/routing-stats', adminLimiter, auth, getRoutingStats);

router.post('/bulk-status', adminLimiter, auth, bulkUpdateStatus);
router.post('/bulk-department', adminLimiter, auth, bulkAssignDepartment);
router.post('/send-reminders', adminLimiter, auth, sendReminders);

router.get('/', adminLimiter, auth, list);

router.get('/:refNumber/attachment/:storedAs', adminLimiter, auth, downloadAttachment);
router.delete('/:refNumber/attachment/:storedAs', adminLimiter, auth, deleteAttachment);

router.get('/:id', adminLimiter, auth, getOne);
router.patch('/:id', adminLimiter, auth, update);

export default router;