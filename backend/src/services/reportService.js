import Application from '../models/Application.js';

const REPORT_FILTERS = {
  'high-value-developers': { tags: { $in: ['HIGH_VALUE', 'LARGE_CAPITAL'] } },
  // Spec §9.3: PIPELINE_READY only emits for developers (LAND_SECURED +
  // SHOVEL_READY composite). Naming clarified to match.
  'pipeline-ready-developers': { tags: { $in: ['PIPELINE_READY'] } },
  // DEPRECATED alias for `pipeline-ready-developers` (renamed 2026-05-11).
  // Kept for one release so old bookmarks / dashboards keep working.
  'pipeline-ready-land': { tags: { $in: ['PIPELINE_READY'] } },
  'institutional-grade-housing': { tags: { $in: ['INSTITUTIONAL_GRADE'] } },
  'deal-room-shortlist': { status: { $in: ['shortlisted', 'invited'] } },
};

const REPORT_DESCRIPTIONS = {
  'high-value-developers': 'Developers flagged as HIGH_VALUE or LARGE_CAPITAL seeking significant funding.',
  'pipeline-ready-developers': 'Developers with pipeline-ready projects (land secured + shovel-ready).',
  'pipeline-ready-land': '(Deprecated alias — use pipeline-ready-developers instead.) Developers with pipeline-ready projects.',
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
