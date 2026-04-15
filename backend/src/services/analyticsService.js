import AnalyticsEvent from '../models/AnalyticsEvent.js';
import Application from '../models/Application.js';
import logger from '../utils/logger.js';

/**
 * Track an analytics event (fire-and-forget)
 */
export function track(event, category, { actor, target, meta, req } = {}) {
  AnalyticsEvent.create({
    event,
    category,
    actor: actor || { type: 'system' },
    target,
    meta,
    ip: req?.ip,
    userAgent: req?.get('user-agent'),
  }).catch(err => logger.error(`Analytics track error: ${err.message}`));
}

/**
 * Dashboard overview — KPIs and summaries
 */
export async function getDashboard(dateRange) {
  const { start, end } = parseDateRange(dateRange);
  const match = { timestamp: { $gte: start, $lte: end } };

  const [
    totalApplications,
    applicationsByPeriod,
    eventCounts,
    topEvents,
  ] = await Promise.all([
    Application.countDocuments(),
    Application.aggregate([
      { $match: { submittedAt: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt', timezone: 'Africa/Johannesburg' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: match },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: match },
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return { totalApplications, applicationsByPeriod, eventCounts, topEvents, dateRange: { start, end } };
}

/**
 * Application funnel — submissions by status
 */
export async function getFunnel() {
  const [byStatus, byType, conversionPipeline] = await Promise.all([
    Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Application.aggregate([
      { $group: { _id: '$userType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Application.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          reviewing: [{ $match: { status: { $in: ['reviewing', 'shortlisted', 'invited', 'funded'] } } }, { $count: 'count' }],
          shortlisted: [{ $match: { status: { $in: ['shortlisted', 'invited', 'funded'] } } }, { $count: 'count' }],
          invited: [{ $match: { status: { $in: ['invited', 'funded'] } } }, { $count: 'count' }],
          funded: [{ $match: { status: 'funded' } }, { $count: 'count' }],
        },
      },
    ]),
  ]);

  const pipeline = conversionPipeline[0];
  const funnel = {
    new: pipeline.total[0]?.count || 0,
    reviewing: pipeline.reviewing[0]?.count || 0,
    shortlisted: pipeline.shortlisted[0]?.count || 0,
    invited: pipeline.invited[0]?.count || 0,
    funded: pipeline.funded[0]?.count || 0,
  };

  return { byStatus, byType, funnel };
}

/**
 * Submissions over time — daily/weekly/monthly
 */
export async function getSubmissionTrends(granularity = 'day', dateRange) {
  const { start, end } = parseDateRange(dateRange);

  const dateFormat = {
    day: '%Y-%m-%d',
    week: '%Y-W%V',
    month: '%Y-%m',
  }[granularity] || '%Y-%m-%d';

  const trends = await Application.aggregate([
    { $match: { submittedAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$submittedAt', timezone: 'Africa/Johannesburg' } },
        count: { $sum: 1 },
        types: { $push: '$userType' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Break down types per period
  const data = trends.map(t => {
    const typeCounts = {};
    t.types.forEach(type => { typeCounts[type] = (typeCounts[type] || 0) + 1; });
    return { period: t._id, total: t.count, byType: typeCounts };
  });

  return { granularity, dateRange: { start, end }, data };
}

/**
 * Tag analytics — distribution and co-occurrence
 */
export async function getTagAnalytics() {
  const [tagDistribution, tagCoOccurrence, tagsByType] = await Promise.all([
    Application.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Application.aggregate([
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$_id',
          tags: { $push: '$tags' },
        },
      },
      { $unwind: '$tags' },
      {
        $lookup: {
          from: 'applications',
          localField: '_id',
          foreignField: '_id',
          as: 'app',
        },
      },
      { $unwind: '$app' },
      { $unwind: '$app.tags' },
      { $match: { $expr: { $gt: ['$app.tags', '$tags'] } } },
      {
        $group: {
          _id: { tag1: '$tags', tag2: '$app.tags' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    Application.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: { type: '$userType', tag: '$tags' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      {
        $group: {
          _id: '$_id.type',
          tags: { $push: { tag: '$_id.tag', count: '$count' } },
        },
      },
    ]),
  ]);

  return { tagDistribution, tagCoOccurrence, tagsByType };
}

/**
 * Geographic / profile demographics
 */
export async function getDemographics() {
  const [byType, byValue, byFundingHistory, byLandStatus] = await Promise.all([
    Application.aggregate([
      { $group: { _id: '$userType', count: { $sum: 1 }, avgTags: { $avg: { $size: '$tags' } } } },
      { $sort: { count: -1 } },
    ]),
    Application.aggregate([
      { $group: { _id: '$formData.estimatedValue', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Application.aggregate([
      { $group: { _id: '$formData.previousFunding', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Application.aggregate([
      { $group: { _id: '$formData.landStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return { byType, byValue, byFundingHistory, byLandStatus };
}

/**
 * Deal room analytics
 */
export async function getDealRoomAnalytics() {
  const [summitAccess, dealRoomEntry, funderDistribution, funderPipeline] = await Promise.all([
    Application.countDocuments({ 'dealRoom.summitAccess': true }),
    Application.countDocuments({ 'dealRoom.dealRoomEntry': true }),
    Application.aggregate([
      { $match: { 'dealRoom.funders.0': { $exists: true } } },
      { $unwind: '$dealRoom.funders' },
      { $group: { _id: '$dealRoom.funders', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Application.aggregate([
      { $match: { status: { $in: ['shortlisted', 'invited', 'funded'] } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          withSummitAccess: { $sum: { $cond: ['$dealRoom.summitAccess', 1, 0] } },
          withDealRoom: { $sum: { $cond: ['$dealRoom.dealRoomEntry', 1, 0] } },
          avgFunders: { $avg: { $size: { $ifNull: ['$dealRoom.funders', []] } } },
        },
      },
    ]),
  ]);

  return { summitAccess, dealRoomEntry, funderDistribution, funderPipeline };
}

/**
 * Event log — paginated activity feed
 */
export async function getEventLog({ page: rawPage = 1, limit: rawLimit = 50, category, event, startDate, endDate }) {
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 50));
  const filter = {};
  if (category) filter.category = category;
  if (event) filter.event = event;
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  const total = await AnalyticsEvent.countDocuments(filter);
  const data = await AnalyticsEvent.find(filter)
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return { data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
}

// ── Helpers ──

function parseDateRange(dateRange) {
  const now = new Date();
  let start, end = now;

  switch (dateRange) {
    case '7d':
      start = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(now - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      start = new Date(now - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now - 30 * 24 * 60 * 60 * 1000);
  }

  return { start, end };
}
