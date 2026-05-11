import { Router } from 'express';
import { body, query, param } from 'express-validator';
import validator from 'validator';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { publicApplicationLimiter, adminLimiter } from '../config/rateLimit.js';
import { PROFILE_CATEGORIES, APPLICATION_STATUSES, SORTABLE_FIELDS, FUNDER_NAMES } from '../constants/enums.js';
import {
  submit, list, getOne, update, stats, exportCsv, bulkUpdateStatus, sendReminders,
  uploadCv, downloadAttachment, deleteAttachment, downloadSignedAttachment,
} from '../controllers/applicationController.js';
import { singleCvUploadMiddleware } from '../services/uploadService.js';
import { csrfProtection } from '../middleware/auth.js';
import { sendDataExportReceipt, sendDataDeleteReceipt } from '../utils/mailer.js';
import logger from '../utils/logger.js';

// Sanitize HTML to prevent XSS in name fields
const sanitizeName = (val) => val ? validator.escape(String(val).trim().slice(0, 100)) : val;

const router = Router();

// ── Public ──
router.post('/', publicApplicationLimiter,
  body('userType').isIn(PROFILE_CATEGORIES).withMessage('Invalid profile category'),
  body('personal').isObject().withMessage('Personal info required'),
  body('personal.firstName').notEmpty().withMessage('First name required')
    .isLength({ max: 100 }).withMessage('First name max 100 characters')
    .customSanitizer(sanitizeName)
    .matches(/^[^<>{}[\]\\^`"|~]*$/).withMessage('Invalid characters in first name'),
  body('personal.surname').notEmpty().withMessage('Surname required')
    .isLength({ max: 100 }).withMessage('Surname max 100 characters')
    .customSanitizer(sanitizeName)
    .matches(/^[^<>{}[\]\\^`"|~]*$/).withMessage('Invalid characters in surname'),
  body('personal.email').isEmail().withMessage('Valid email required').isLength({ max: 254 }).withMessage('Email too long')
    .normalizeEmail(),
  body('personal.phone').notEmpty().withMessage('Phone required')
    .matches(/^(\+?27\d{9}|0\d{9})$/).withMessage('Valid SA phone required (e.g. 0821234567 or +27821234567)'),
  body('personal.companyName').optional().isString().withMessage('Company name must be a string'),
  body('formData').optional().isObject().withMessage('formData must be an object')
    .custom((val) => {
      // Reject deeply nested or oversized formData
      const str = JSON.stringify(val);
      if (str.length > 10000) throw new Error('formData too large');
      // Whitelist known top-level keys (legacy + new spec §7.2)
      const allowed = new Set([
        // Legacy keys (kept for backwards compat with old frontend builds)
        'landStatus', 'projectStage', 'estimatedValue', 'seeking', 'previousFunding',
        'projectDescription', 'summitAttendance', 'tcAccepted', 'popiaConsent',
        'yearsExperience', 'landSize', 'zoningStatus', 'isServiced',
        'ownershipStructure', 'investmentFocus', 'investmentTicket', 'bedCount', 'occupancyRate',
        'universityPartnership', 'assetType', 'profession', 'registrationStatus', 'projectScale',
        'developmentInterests', 'relevantExperience', 'engagementSource',
        // Universal (spec §7.2)
        'activityLevel', 'feedback', 'notActiveReason',
        // Developer
        'developmentStage', 'developmentTypes', 'projectValue', 'fundingPosition',
        'biggestConstraint', 'biggestConstraintOther', 'whatMatters',
        // Land Owner
        'landLocation', 'landOutcome', 'zoning', 'startedDevWork', 'whatPreventsProgress',
        // Investor
        'investmentOpportunities', 'investmentRange', 'investmentApproach', 'decisionDrivers',
        'capitalDeployment',
        // Student Operator
        'portfolioSize', 'portfolioLocations', 'opChallenge', 'occupancyLevel', 'scaleLimit',
        // Professional
        'primaryRole', 'experienceLevel', 'provinces', 'workStructure', 'companyPractice',
        'projectTypes', 'avgProjectSize', 'workStyle', 'proWhatMatters',
        'notActiveReasonOther',
        // (legacy `activityLookingNow` + `whyNotLooking` removed 2026-05-11 —
        // collapsed onto universal `activityLevel` + `notActiveReason` per spec §14)
        // Aspiring
        'involvedBefore', 'hasLandAccess', 'aspiringDevType', 'holdingBack', 'realisticStart',
      ]);
      for (const key of Object.keys(val)) {
        if (!allowed.has(key)) delete val[key]; // Strip unknown fields
      }
      return true;
    }),
  // Spec §8.2 — optional attachments[] (CV references from /upload).
  body('attachments').optional().isArray({ max: 5 }).withMessage('attachments must be an array (max 5)'),
  body('attachments.*.field').optional().isString().withMessage('attachments[].field required'),
  body('attachments.*.storedAs').optional().isString()
    .matches(/^[a-zA-Z0-9._-]+$/).withMessage('attachments[].storedAs must be a safe basename'),
  // POPIA — both consents are mandatory at submission. The frontend gates
  // the Submit button on these but server-side enforcement is the
  // load-bearing check for compliance.
  body('consent').isObject().withMessage('Consent required'),
  body('consent.tc').isBoolean().withMessage('T&Cs consent must be boolean')
    .custom((v) => v === true).withMessage('Terms & Conditions must be accepted'),
  body('consent.popia').isBoolean().withMessage('POPIA consent must be boolean')
    .custom((v) => v === true).withMessage('POPIA consent must be granted'),
  validate,
  submit,
);

// ── Public: CV upload (no auth, CSRF required, rate-limited) ──
// Spec §8.1 — POST /api/applications/upload (multipart/form-data, field "file")
router.post('/upload',
  publicApplicationLimiter,
  csrfProtection,
  singleCvUploadMiddleware,
  uploadCv,
);

// ── Public: status lookup (no auth, rate-limited) ──
router.post('/lookup',
  publicApplicationLimiter,
  body('refNumber').notEmpty().withMessage('Reference number required'),
  body('email').isEmail().withMessage('Valid email required'),
  validate,
  async (req, res, next) => {
    try {
      const { refNumber, email } = req.body;
      const app = await (await import('../models/Application.js')).default.findOne({
        refNumber: refNumber.trim().toUpperCase(),
        'personal.email': email.trim().toLowerCase(),
      }).select('refNumber userType status tags dealRoom.summitAccess allocatedProjects submittedAt updatedAt personal.firstName');

      if (!app) {
        return res.status(404).json({ success: false, message: 'No application found. Please check your reference number and email.' });
      }

      res.json({
        success: true,
        data: {
          refNumber: app.refNumber,
          firstName: validator.escape(app.personal.firstName),
          userType: app.userType,
          status: app.status,
          tags: app.tags,
          summitAccess: app.dealRoom?.summitAccess || false,
          allocatedProjects: app.allocatedProjects || [],
          submittedAt: app.submittedAt,
          updatedAt: app.updatedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── POPIA: data export + deletion (public, rate-limited, requires refNumber + email) ──
router.post('/data-export',
  publicApplicationLimiter,
  body('refNumber').notEmpty().withMessage('Reference number required'),
  body('email').isEmail().withMessage('Valid email required'),
  validate,
  async (req, res, next) => {
    try {
      const { refNumber, email } = req.body;
      const Application = (await import('../models/Application.js')).default;
      const app = await Application.findOne({
        refNumber: refNumber.trim().toUpperCase(),
        'personal.email': email.trim().toLowerCase(),
      }).select('-__v');

      if (!app) {
        return res.status(404).json({ success: false, message: 'No application found.' });
      }

      const { track } = await import('../services/analyticsService.js');
      track('popia.data_export', 'system', {
        actor: { type: 'applicant', email: email.trim().toLowerCase() },
        target: { model: 'Application', id: app._id.toString(), refNumber: app.refNumber },
        req,
      });

      // Spec §8.5 — enrich attachments[] with short-lived signed download URLs.
      const { buildSignedDownloadUrl } = await import('../utils/signedLinks.js');
      const data = app.toObject();
      if (Array.isArray(data.attachments)) {
        data.attachments = data.attachments.map((a) => ({
          field: a.field,
          filename: a.filename,
          storedAs: a.storedAs,
          size: a.size,
          mimeType: a.mimeType,
          uploadedAt: a.uploadedAt,
          downloadUrl: buildSignedDownloadUrl(app.refNumber, a.storedAs),
        }));
      }

      // POPIA audit-trail receipt — fire-and-forget (must not block the
      // response if Resend is down or slow). The mailer logs success/failure
      // to EmailLog + winston; we additionally log any unhandled exception
      // here so silent network errors don't disappear from the audit trail.
      sendDataExportReceipt(app.personal.email, app.refNumber, app.personal.firstName)
        .catch((err) => logger.error('POPIA data-export receipt failed', {
          refNumber: app.refNumber,
          error: err?.message || String(err),
        }));

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
);

router.post('/data-delete',
  publicApplicationLimiter,
  body('refNumber').notEmpty().withMessage('Reference number required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('confirm').equals('DELETE').withMessage('Must send confirm: "DELETE" to proceed'),
  validate,
  async (req, res, next) => {
    try {
      const { refNumber, email } = req.body;
      const Application = (await import('../models/Application.js')).default;
      const app = await Application.findOneAndDelete({
        refNumber: refNumber.trim().toUpperCase(),
        'personal.email': email.trim().toLowerCase(),
      });

      if (!app) {
        return res.status(404).json({ success: false, message: 'No application found.' });
      }

      // Capture identity BEFORE the record is gone from memory — the receipt
      // email needs the user's first name and the destination address.
      const receiptTo = app.personal.email;
      const receiptName = app.personal.firstName;
      const receiptRef = app.refNumber;

      // Spec §8.6 — POPIA right-to-erasure trumps file persistence.
      // Best-effort: remove files. If disk delete fails, log + proceed.
      if (Array.isArray(app.attachments) && app.attachments.length) {
        const { deleteCvFile } = await import('../services/uploadService.js');
        const { default: logger } = await import('../utils/logger.js');
        for (const a of app.attachments) {
          try {
            const ok = await deleteCvFile(a.storedAs);
            if (!ok) logger.warn('data-delete: attachment file already missing', { refNumber: app.refNumber, storedAs: a.storedAs });
          } catch (err) {
            logger.error('data-delete: attachment file removal failed', { refNumber: app.refNumber, storedAs: a.storedAs, error: err.message });
          }
        }
      }

      const { track } = await import('../services/analyticsService.js');
      track('popia.data_deleted', 'system', {
        actor: { type: 'applicant', email: email.trim().toLowerCase() },
        target: { model: 'Application', refNumber: app.refNumber },
        req,
      });

      // POPIA audit-trail receipt — fire-and-forget; explicit logging so a
      // silent send failure still leaves a server-log breadcrumb (the mailer
      // also writes to EmailLog).
      sendDataDeleteReceipt(receiptTo, receiptRef, receiptName)
        .catch((err) => logger.error('POPIA data-delete receipt failed', {
          refNumber: receiptRef,
          error: err?.message || String(err),
        }));

      res.json({ success: true, message: 'Your data has been permanently deleted.' });
    } catch (err) {
      next(err);
    }
  },
);

// ── Admin (order matters: static routes before :id) ──
router.get('/stats', adminLimiter, auth, stats);
router.get('/export/csv', adminLimiter, auth, exportCsv);
router.post('/bulk-status',
  adminLimiter,
  auth,
  body('ids').isArray({ min: 1, max: 100 }).withMessage('ids must be an array with 1-100 items'),
  body('ids.*').isMongoId().withMessage('Each id must be a valid MongoDB ObjectId'),
  body('status').isIn(APPLICATION_STATUSES).withMessage('Invalid status'),
  validate,
  bulkUpdateStatus);

router.post('/send-reminders',
  adminLimiter,
  auth,
  body('ids').isArray({ min: 1, max: 100 }).withMessage('ids must be an array with 1-100 items'),
  body('ids.*').isMongoId().withMessage('Each id must be a valid MongoDB ObjectId'),
  validate,
  sendReminders);

router.get('/',
  adminLimiter,
  auth,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('userType').optional().isIn([...PROFILE_CATEGORIES, 'all']).withMessage('Invalid userType'),
  query('status').optional().isIn([...APPLICATION_STATUSES, 'all']).withMessage('Invalid status'),
  query('sortBy').optional().isIn(SORTABLE_FIELDS).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  validate,
  list,
);

// ── Public: signed attachment download — spec §8.5 ──
// IMPORTANT: NO auth, NO csrfProtection. Verifies HMAC signature + expiry.
// Defined before /:id so the literal /attachment/ segment wins routing.
router.get('/:refNumber/attachment/:storedAs/signed',
  publicApplicationLimiter,
  param('refNumber').matches(/^BM-[A-Z0-9]{4,12}$/).withMessage('Invalid reference number format'),
  param('storedAs').matches(/^[a-zA-Z0-9._-]+$/).withMessage('Invalid storedAs'),
  validate,
  downloadSignedAttachment,
);

// ── Admin: download attachment — spec §8.3 ──
router.get('/:refNumber/attachment/:storedAs',
  adminLimiter,
  auth,
  param('refNumber').matches(/^BM-[A-Z0-9]{4,12}$/).withMessage('Invalid reference number format'),
  param('storedAs').matches(/^[a-zA-Z0-9._-]+$/).withMessage('Invalid storedAs'),
  validate,
  downloadAttachment,
);

// ── Admin: delete attachment — spec §8.4 ──
router.delete('/:refNumber/attachment/:storedAs',
  adminLimiter,
  auth,
  param('refNumber').matches(/^BM-[A-Z0-9]{4,12}$/).withMessage('Invalid reference number format'),
  param('storedAs').matches(/^[a-zA-Z0-9._-]+$/).withMessage('Invalid storedAs'),
  validate,
  deleteAttachment,
);

router.get('/:id',
  adminLimiter,
  auth,
  param('id').isMongoId().withMessage('Invalid application ID'),
  validate,
  getOne,
);

router.patch('/:id',
  adminLimiter,
  auth,
  param('id').isMongoId().withMessage('Invalid application ID'),
  body('status').optional().isIn(APPLICATION_STATUSES).withMessage('Invalid status'),
  body('adminNotes').optional().isString().withMessage('adminNotes must be a string')
    .isLength({ max: 5000 }).withMessage('adminNotes max 5000 characters'),
  body('dealRoom').optional().isObject().withMessage('dealRoom must be an object'),
  body('dealRoom.summitAccess').optional().isBoolean().withMessage('dealRoom.summitAccess must be a boolean'),
  body('dealRoom.dealRoomEntry').optional().isBoolean().withMessage('dealRoom.dealRoomEntry must be a boolean'),
  body('dealRoom.funders').optional().isArray().withMessage('dealRoom.funders must be an array'),
  body('dealRoom.funders.*').optional().isIn(FUNDER_NAMES).withMessage('Invalid funder name'),
  body('classification').optional().isIn(['hot', 'warm', 'cold', 'unclassified']).withMessage('Invalid classification'),
  body('followUp').optional().isObject().withMessage('followUp must be an object'),
  body('followUp.required').optional().isBoolean().withMessage('followUp.required must be a boolean'),
  body('followUp.dueDate').optional().isISO8601().withMessage('followUp.dueDate must be a valid date'),
  body('followUp.notes').optional().isString().withMessage('followUp.notes must be a string')
    .isLength({ max: 2000 }).withMessage('followUp.notes max 2000 characters'),
  validate,
  update,
);

export default router;
