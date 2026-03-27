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

export async function runReport(name) {
  const filter = REPORT_FILTERS[name];
  if (!filter) throw Object.assign(new Error('Unknown report'), { status: 400 });

  const apps = await Application.find(filter).sort({ submittedAt: -1 });
  return {
    report: name,
    description: REPORT_DESCRIPTIONS[name] || '',
    count: apps.length,
    data: apps,
  };
}
