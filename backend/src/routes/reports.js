import { Router } from 'express';
import { param } from 'express-validator';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { REPORT_NAMES } from '../constants/enums.js';
import { getReport } from '../controllers/reportController.js';

const router = Router();

router.get('/:name',
  auth,
  param('name').isIn(REPORT_NAMES).withMessage('Invalid report name'),
  validate,
  getReport,
);

export default router;
