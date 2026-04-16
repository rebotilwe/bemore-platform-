import PageView from '../models/PageView.js';
import TrackingEvent from '../models/TrackingEvent.js';

function parseDateRange(range = '30d') {
  const now = new Date();
  const map = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  const days = map[range] || 30;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end: now };
}

/**
 * Traffic overview — page views, visitors, sessions, bounce rate, top pages
 */
export async function getTrafficOverview(range) {
  const { start, end } = parseDateRange(range);
  const match = { timestamp: { $gte: start, $lte: end } };

  const [totals, topPages, sessionStats] = await Promise.all([
    // Total page views + unique visitors + unique sessions
    PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          pageViews: { $sum: 1 },
          visitors: { $addToSet: '$visitorId' },
          sessions: { $addToSet: '$sessionId' },
        },
      },
      {
        $project: {
          _id: 0,
          pageViews: 1,
          uniqueVisitors: { $size: '$visitors' },
          uniqueSessions: { $size: '$sessions' },
        },
      },
    ]),

    // Top 10 pages
    PageView.aggregate([
      { $match: match },
      { $group: { _id: '$path', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),

    // Session-level stats (avg duration + bounce rate)
    PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$sessionId',
          pageCount: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          firstView: { $min: '$timestamp' },
          lastView: { $max: '$timestamp' },
        },
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          avgDuration: { $avg: '$totalDuration' },
          bounces: { $sum: { $cond: [{ $eq: ['$pageCount', 1] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          avgDuration: { $round: ['$avgDuration', 0] },
          bounceRate: {
            $round: [
              { $multiply: [{ $divide: ['$bounces', { $max: ['$totalSessions', 1] }] }, 100] },
              1,
            ],
          },
        },
      },
    ]),
  ]);

  const t = totals[0] || { pageViews: 0, uniqueVisitors: 0, uniqueSessions: 0 };
  const s = sessionStats[0] || { avgDuration: 0, bounceRate: 0 };

  return {
    pageViews: t.pageViews,
    uniqueVisitors: t.uniqueVisitors,
    uniqueSessions: t.uniqueSessions,
    avgDuration: s.avgDuration,
    bounceRate: s.bounceRate,
    topPages,
    dateRange: { start, end },
  };
}

/**
 * Referrer and UTM breakdown
 */
export async function getReferrerBreakdown(range) {
  const { start, end } = parseDateRange(range);
  const match = { timestamp: { $gte: start, $lte: end } };

  const [referrers, utmSources] = await Promise.all([
    PageView.aggregate([
      { $match: { ...match, referrer: { $ne: '' } } },
      {
        $project: {
          domain: {
            $let: {
              vars: {
                ref: '$referrer',
              },
              in: {
                $cond: [
                  { $regexMatch: { input: '$$ref', regex: /^https?:\/\/([^/]+)/ } },
                  {
                    $arrayElemAt: [
                      { $regexFind: { input: '$$ref', regex: /^https?:\/\/([^/]+)/ } },
                      0,
                    ],
                  },
                  '$$ref',
                ],
              },
            },
          },
        },
      },
      // Simplified: just group by full referrer domain
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),

    PageView.aggregate([
      { $match: { ...match, utmSource: { $ne: '' } } },
      { $group: { _id: '$utmSource', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  // Extract domain from referrer URLs
  const referrerDomains = referrers.map(r => {
    try {
      const url = new URL(r._id);
      return { _id: url.hostname, count: r.count };
    } catch {
      return { _id: r._id, count: r.count };
    }
  });

  return { referrers: referrerDomains, utmSources };
}

/**
 * Device, browser, OS breakdown
 */
export async function getDeviceBreakdown(range) {
  const { start, end } = parseDateRange(range);
  const match = { timestamp: { $gte: start, $lte: end } };

  const [byDeviceType, byBrowser, byOS] = await Promise.all([
    PageView.aggregate([
      { $match: match },
      { $group: { _id: '$device.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    PageView.aggregate([
      { $match: match },
      { $group: { _id: '$device.browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    PageView.aggregate([
      { $match: match },
      { $group: { _id: '$device.os', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return { byDeviceType, byBrowser, byOS };
}

/**
 * Hourly traffic heatmap (7 days x 24 hours)
 */
export async function getHourlyTraffic(range) {
  const { start, end } = parseDateRange(range);

  const data = await PageView.aggregate([
    { $match: { timestamp: { $gte: start, $lte: end } } },
    {
      $project: {
        hour: { $hour: { date: '$timestamp', timezone: 'Africa/Johannesburg' } },
        dayOfWeek: { $dayOfWeek: { date: '$timestamp', timezone: 'Africa/Johannesburg' } },
      },
    },
    {
      $group: {
        _id: { day: '$dayOfWeek', hour: '$hour' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.day': 1, '_id.hour': 1 } },
  ]);

  return { data };
}

/**
 * Form funnel — step-by-step progression
 */
export async function getFormFunnel(range) {
  const { start, end } = parseDateRange(range);
  const match = { timestamp: { $gte: start, $lte: end }, category: 'form_funnel' };

  const steps = await TrackingEvent.aggregate([
    { $match: match },
    { $group: { _id: '$action', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return { steps };
}

/**
 * Top clicked CTAs and interactions
 */
export async function getClickAnalytics(range) {
  const { start, end } = parseDateRange(range);
  const match = { timestamp: { $gte: start, $lte: end }, category: 'click' };

  const clicks = await TrackingEvent.aggregate([
    { $match: match },
    { $group: { _id: '$label', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 },
  ]);

  return { clicks };
}

/**
 * Traffic over time (daily/weekly/monthly)
 */
export async function getTrafficTrends(granularity = 'day', range = '30d') {
  const { start, end } = parseDateRange(range);

  const formatMap = {
    day: '%Y-%m-%d',
    week: '%Y-W%V',
    month: '%Y-%m',
  };
  const format = formatMap[granularity] || '%Y-%m-%d';

  const data = await PageView.aggregate([
    { $match: { timestamp: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format, date: '$timestamp', timezone: 'Africa/Johannesburg' } },
        views: { $sum: 1 },
        visitors: { $addToSet: '$visitorId' },
      },
    },
    {
      $project: {
        _id: 0,
        period: '$_id',
        views: 1,
        uniqueVisitors: { $size: '$visitors' },
      },
    },
    { $sort: { period: 1 } },
  ]);

  return { granularity, data, dateRange: { start, end } };
}
