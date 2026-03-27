import Application from '../models/Application.js';

const REPORT_FILTERS = {
  'high-value-developers': { tags: { $in: ['HIGH_VALUE', 'LARGE_CAPITAL'] } },
  'pipeline-ready-land': { tags: { $in: ['PIPELINE_READY'] } },
  'institutional-grade-housing': { tags: { $in: ['INSTITUTIONAL_GRADE'] } },
  'deal-room-shortlist': { status: { $in: ['shortlisted', 'invited'] } },
};

const REPORT_DESCRIPTIONS = {
  'high-value-developers': 'Developers flagged as HIGH_VALUE or LARGE_CAPITAL seeking significant funding.',
  'pipeline-ready-land': 'Landowners with PIPELINE_READY assets available for development.',
  'institutional-grade-housing': 'Operators meeting INSTITUTIONAL_GRADE criteria for student accommodation.',
  'deal-room-shortlist': 'All shortlisted and invited applicants ready for deal room access.',
};

export async function getReport(req, res, next) {
  try {
    const name = req.params.name;
    const apps = await Application.find(REPORT_FILTERS[name]).sort({ submittedAt: -1 });
    res.json({
      success: true,
      data: {
        report: name,
        description: REPORT_DESCRIPTIONS[name] || '',
        count: apps.length,
        data: apps,
      },
    });
  } catch (err) {
    next(err);
  }
}
