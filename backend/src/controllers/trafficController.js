import * as trafficService from '../services/trafficService.js';
import logger from '../utils/logger.js';

export async function trafficOverview(req, res) {
  try {
    const data = await trafficService.getTrafficOverview(req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Traffic overview error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to load traffic overview' });
  }
}

export async function trafficTrends(req, res) {
  try {
    const data = await trafficService.getTrafficTrends(req.query.granularity, req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Traffic trends error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to load traffic trends' });
  }
}

export async function trafficReferrers(req, res) {
  try {
    const data = await trafficService.getReferrerBreakdown(req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Traffic referrers error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to load referrer data' });
  }
}

export async function trafficDevices(req, res) {
  try {
    const data = await trafficService.getDeviceBreakdown(req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Traffic devices error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to load device data' });
  }
}

export async function trafficHours(req, res) {
  try {
    const data = await trafficService.getHourlyTraffic(req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Traffic hours error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to load hourly data' });
  }
}

export async function trafficFormFunnel(req, res) {
  try {
    const data = await trafficService.getFormFunnel(req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Traffic form funnel error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to load form funnel' });
  }
}

export async function trafficClicks(req, res) {
  try {
    const data = await trafficService.getClickAnalytics(req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Traffic clicks error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to load click data' });
  }
}
