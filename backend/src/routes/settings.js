import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { adminLimiter } from '../config/rateLimit.js';
import { getSetting, setSetting, getAllSettings } from '../models/SiteSettings.js';
import { track } from '../services/analyticsService.js';

const router = Router();

const ALLOWED_SETTINGS = [
  'mentimeterEmbedId', 'mentimeter_id',
  'polls_enabled',
  'registrationOpen', 'maintenanceMode', 'platformAnnouncement',
];

// Public: get specific setting (e.g., mentimeter ID)
router.get('/public/:key', async (req, res) => {
  const value = await getSetting(req.params.key);
  res.json({ success: true, data: { key: req.params.key, value } });
});

// Admin: get all settings
router.get('/', adminLimiter, auth, async (_req, res) => {
  const settings = await getAllSettings();
  res.json({ success: true, data: settings });
});

// Admin: update a setting
router.put('/:key',
  adminLimiter,
  auth,
  body('value').exists().withMessage('Value is required'),
  validate,
  async (req, res) => {
    if (!ALLOWED_SETTINGS.includes(req.params.key)) {
      return res.status(400).json({ success: false, message: `Unknown setting key: "${req.params.key}"` });
    }
    await setSetting(req.params.key, req.body.value);

    track('settings.updated', 'admin', {
      actor: { type: 'admin', id: req.admin?.id, email: req.admin?.email },
      meta: { key: req.params.key },
      req,
    });

    res.json({ success: true, message: `Setting "${req.params.key}" updated` });
  },
);

export default router;
