import { Router } from 'express';
import { body, query, param } from 'express-validator';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { publicApplicationLimiter, adminLimiter } from '../config/rateLimit.js';
import { PROFILE_CATEGORIES, APPLICATION_STATUSES, SORTABLE_FIELDS, FUNDER_NAMES } from '../constants/enums.js';
import { submit, list, getOne, update, stats, exportCsv, bulkUpdateStatus, sendReminders } from '../controllers/applicationController.js';

const router = Router();

// ── Public ──
router.post('/', publicApplicationLimiter,
  body('userType').isIn(PROFILE_CATEGORIES).withMessage('Invalid profile category'),
  body('personal').isObject().withMessage('Personal info required'),
  body('personal.firstName').notEmpty().withMessage('First name required'),
  body('personal.surname').notEmpty().withMessage('Surname required'),
  body('personal.email').isEmail().withMessage('Valid email required'),
  body('personal.phone').notEmpty().withMessage('Phone required').matches(/^[\d\s\-+()]{10,15}$/).withMessage('Phone must be 10-15 digits'),
  body('personal.companyName').optional().isString().withMessage('Company name must be a string'),
  body('formData').optional().isObject().withMessage('formData must be an object'),
  validate,
  submit,
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
      }).select('refNumber userType status tags dealRoom.summitAccess submittedAt updatedAt personal.firstName');

      if (!app) {
        return res.status(404).json({ success: false, message: 'No application found. Please check your reference number and email.' });
      }

      res.json({
        success: true,
        data: {
          refNumber: app.refNumber,
          firstName: app.personal.firstName,
          userType: app.userType,
          status: app.status,
          tags: app.tags,
          summitAccess: app.dealRoom?.summitAccess || false,
          submittedAt: app.submittedAt,
          updatedAt: app.updatedAt,
        },
      });
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
  body('adminNotes').optional().isString().withMessage('adminNotes must be a string'),
  body('dealRoom').optional().isObject().withMessage('dealRoom must be an object'),
  body('dealRoom.summitAccess').optional().isBoolean().withMessage('dealRoom.summitAccess must be a boolean'),
  body('dealRoom.dealRoomEntry').optional().isBoolean().withMessage('dealRoom.dealRoomEntry must be a boolean'),
  body('dealRoom.funders').optional().isArray().withMessage('dealRoom.funders must be an array'),
  body('dealRoom.funders.*').optional().isIn(FUNDER_NAMES).withMessage('Invalid funder name'),
  body('classification').optional().isIn(['hot', 'warm', 'cold', 'unclassified']).withMessage('Invalid classification'),
  body('followUp').optional().isObject().withMessage('followUp must be an object'),
  body('followUp.required').optional().isBoolean().withMessage('followUp.required must be a boolean'),
  body('followUp.dueDate').optional().isISO8601().withMessage('followUp.dueDate must be a valid date'),
  body('followUp.notes').optional().isString().withMessage('followUp.notes must be a string'),
  validate,
  update,
);

export default router;
