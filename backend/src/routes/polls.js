import { Router } from 'express';
import { body, param, query } from 'express-validator';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { adminLimiter } from '../config/rateLimit.js';
import { voteLimiter } from '../config/rateLimit.js';
import { create, list, getOne, update, remove, setStatus, activate, results, getActive, vote, liveStream } from '../controllers/pollController.js';

const router = Router();

const POLL_STATUSES = ['draft', 'active', 'paused', 'closed'];
const QUESTION_TYPES = ['multiple-choice', 'word-cloud', 'rating', 'open-text'];

// ── Public (no auth) ──

router.get('/active', getActive);

router.post('/:id/vote',
  voteLimiter,
  param('id').isMongoId(),
  body('questionId').isMongoId().withMessage('questionId required'),
  body('sessionId').notEmpty().withMessage('sessionId required'),
  body('optionId').optional().isMongoId(),
  body('textResponse').optional().isString().isLength({ max: 200 }),
  body('ratingValue').optional().isInt({ min: 1, max: 10 }),
  validate,
  vote,
);

router.get('/:id/live',
  param('id').isMongoId(),
  liveStream,
);

// ── Admin (JWT required) ──

router.post('/',
  adminLimiter, auth,
  body('title').notEmpty().isLength({ max: 200 }).withMessage('Title required (max 200 chars)'),
  body('description').optional().isLength({ max: 500 }),
  body('questions').isArray({ min: 1 }).withMessage('At least one question required'),
  body('questions.*.text').notEmpty().isLength({ max: 500 }),
  body('questions.*.type').isIn(QUESTION_TYPES).withMessage(`Type must be: ${QUESTION_TYPES.join(', ')}`),
  validate,
  create,
);

router.get('/',
  adminLimiter, auth,
  query('status').optional().isIn(POLL_STATUSES),
  validate,
  list,
);

router.get('/:id',
  adminLimiter, auth,
  param('id').isMongoId(),
  validate,
  getOne,
);

router.patch('/:id',
  adminLimiter, auth,
  param('id').isMongoId(),
  body('title').optional().isLength({ max: 200 }),
  body('description').optional().isLength({ max: 500 }),
  body('questions').optional().isArray({ min: 1 }),
  validate,
  update,
);

router.patch('/:id/status',
  adminLimiter, auth,
  param('id').isMongoId(),
  body('status').isIn(POLL_STATUSES).withMessage(`Status must be: ${POLL_STATUSES.join(', ')}`),
  validate,
  setStatus,
);

router.patch('/:id/activate',
  adminLimiter, auth,
  param('id').isMongoId(),
  body('questionIndex').isInt({ min: -1 }).withMessage('questionIndex required'),
  validate,
  activate,
);

router.get('/:id/results',
  adminLimiter, auth,
  param('id').isMongoId(),
  validate,
  results,
);

router.delete('/:id',
  adminLimiter, auth,
  param('id').isMongoId(),
  validate,
  remove,
);

export default router;
