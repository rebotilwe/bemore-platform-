import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { UAParser } from 'ua-parser-js';
import PageView from '../models/PageView.js';
import TrackingEvent from '../models/TrackingEvent.js';
import { trackingLimiter } from '../config/rateLimit.js';
import logger from '../utils/logger.js';

const router = Router();

router.use(trackingLimiter);

function parseUA(uaString) {
  const parser = new UAParser(uaString);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();
  return {
    type: device.type || 'desktop',
    browser: browser.name || 'Unknown',
    os: os.name || 'Unknown',
  };
}

// POST /api/track/pageview
router.post('/pageview',
  body('sessionId').isString().notEmpty().isLength({ max: 64 }),
  body('visitorId').isString().notEmpty().isLength({ max: 64 }),
  body('path').isString().notEmpty().isLength({ max: 500 }),
  body('referrer').optional().isString().isLength({ max: 2000 }),
  body('utmSource').optional().isString().isLength({ max: 200 }),
  body('utmMedium').optional().isString().isLength({ max: 200 }),
  body('utmCampaign').optional().isString().isLength({ max: 200 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Invalid tracking data' });
    }

    const ua = req.headers['user-agent'] || '';
    const device = parseUA(ua);

    PageView.create({
      sessionId: req.body.sessionId,
      visitorId: req.body.visitorId,
      path: req.body.path,
      referrer: req.body.referrer || '',
      utmSource: req.body.utmSource || '',
      utmMedium: req.body.utmMedium || '',
      utmCampaign: req.body.utmCampaign || '',
      userAgent: ua,
      device,
      ip: req.ip || '',
      screenWidth: req.body.screenWidth || null,
      screenHeight: req.body.screenHeight || null,
    }).catch(err => logger.error('Failed to save page view', { error: err.message }));

    res.status(202).json({ success: true });
  }
);

// POST /api/track/event
router.post('/event',
  body('sessionId').isString().notEmpty().isLength({ max: 64 }),
  body('visitorId').isString().notEmpty().isLength({ max: 64 }),
  body('category').isIn(['click', 'form_funnel', 'interaction', 'scroll', 'download']),
  body('action').isString().notEmpty().isLength({ max: 200 }),
  body('label').optional().isString().isLength({ max: 500 }),
  body('path').optional().isString().isLength({ max: 500 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Invalid tracking data' });
    }

    const ua = req.headers['user-agent'] || '';

    // Limit meta to a shallow object with max 1KB serialized
    let meta = {};
    if (req.body.meta && typeof req.body.meta === 'object') {
      const raw = JSON.stringify(req.body.meta);
      if (raw.length <= 1024) meta = req.body.meta;
    }

    TrackingEvent.create({
      sessionId: req.body.sessionId,
      visitorId: req.body.visitorId,
      category: req.body.category,
      action: req.body.action,
      label: (req.body.label || '').slice(0, 500),
      value: req.body.value || 0,
      path: (req.body.path || '').slice(0, 500),
      meta,
      ip: req.ip || '',
      userAgent: ua,
    }).catch(err => logger.error('Failed to save tracking event', { error: err.message }));

    res.status(202).json({ success: true });
  }
);

// POST /api/track/heartbeat — update page view duration
router.post('/heartbeat',
  body('sessionId').isString().notEmpty().isLength({ max: 64 }),
  body('path').isString().notEmpty().isLength({ max: 500 }),
  body('duration').isNumeric(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Invalid heartbeat data' });
    }

    PageView.findOneAndUpdate(
      { sessionId: req.body.sessionId, path: req.body.path },
      { duration: Math.round(req.body.duration) },
      { sort: { timestamp: -1 } }
    ).catch(err => logger.error('Failed to update heartbeat', { error: err.message }));

    res.status(202).json({ success: true });
  }
);

export default router;
