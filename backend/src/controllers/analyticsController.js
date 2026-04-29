import * as analytics from '../services/analyticsService.js';

export async function dashboard(req, res, next) {
  try {
    const data = await analytics.getDashboard(req.query.range || '30d');
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function funnel(_req, res, next) {
  try {
    const data = await analytics.getFunnel();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function submissionTrends(req, res, next) {
  try {
    const data = await analytics.getSubmissionTrends(
      req.query.granularity || 'day',
      req.query.range || '30d',
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function tagAnalytics(_req, res, next) {
  try {
    const data = await analytics.getTagAnalytics();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function demographics(_req, res, next) {
  try {
    const data = await analytics.getDemographics();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function dealRoom(_req, res, next) {
  try {
    const data = await analytics.getDealRoomAnalytics();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function eventLog(req, res, next) {
  try {
    const { data: events, pagination } = await analytics.getEventLog({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      category: req.query.category,
      event: req.query.event,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    res.json({ success: true, data: events, pagination });
  } catch (err) {
    next(err);
  }
}
