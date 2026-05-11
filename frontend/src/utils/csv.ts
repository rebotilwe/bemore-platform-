import type { Application, ProfileCategory } from '../types/index.ts';
import { LEGACY_TAGS } from '../constants/tags.ts';

interface ProfileColumn {
  header: string;
  key: string;
}

// Spec §6.8 — profile-conditional columns. Only emitted when at least one
// application of that profile exists in the export set. `__hasCv` is a
// derived column for Professional rows (Yes/empty).
const PROFILE_COLUMN_GROUPS: Record<ProfileCategory, ProfileColumn[]> = {
  developer: [
    { header: 'Development Stage', key: 'developmentStage' },
    { header: 'Project Value', key: 'projectValue' },
    { header: 'Funding Position', key: 'fundingPosition' },
    { header: 'Biggest Constraint', key: 'biggestConstraint' },
  ],
  landowner: [
    { header: 'Land Location', key: 'landLocation' },
    { header: 'Land Size', key: 'landSize' },
    { header: 'Land Outcome', key: 'landOutcome' },
    { header: 'Zoning', key: 'zoning' },
  ],
  investor: [
    { header: 'Investment Range', key: 'investmentRange' },
    { header: 'Investment Approach', key: 'investmentApproach' },
    { header: 'Capital Deployment', key: 'capitalDeployment' },
  ],
  student: [
    { header: 'Portfolio Size', key: 'portfolioSize' },
    { header: 'Occupancy Level', key: 'occupancyLevel' },
    { header: 'Op Challenge', key: 'opChallenge' },
  ],
  professional: [
    { header: 'Primary Role', key: 'primaryRole' },
    { header: 'Experience Level', key: 'experienceLevel' },
    { header: 'Provinces', key: 'provinces' },
    { header: 'Avg Project Size', key: 'avgProjectSize' },
    { header: 'Has Cv', key: '__hasCv' }, // derived from attachments[]
  ],
  aspiring: [
    { header: 'Has Land Access', key: 'hasLandAccess' },
    { header: 'Holding Back', key: 'holdingBack' },
    { header: 'Realistic Start', key: 'realisticStart' },
  ],
};

const PROFILE_ORDER: ProfileCategory[] = [
  'developer', 'landowner', 'investor', 'student', 'professional', 'aspiring',
];

// Universal columns (spec §6.8) — every row, always present.
const UNIVERSAL_COLUMNS: { header: string; emit: (a: Application) => unknown }[] = [
  { header: 'Ref Number',     emit: (a) => a.refNumber },
  { header: 'User Type',      emit: (a) => a.userType },
  { header: 'First Name',     emit: (a) => a.personal?.firstName ?? '' },
  { header: 'Surname',        emit: (a) => a.personal?.surname ?? '' },
  { header: 'Email',          emit: (a) => a.personal?.email ?? '' },
  { header: 'Phone',          emit: (a) => a.personal?.phone ?? '' },
  { header: 'Status',         emit: (a) => a.status },
  { header: 'Classification', emit: (a) => a.classification ?? 'unclassified' },
  { header: 'Activity Level', emit: (a) => (a.formData?.activityLevel as unknown) ?? '' },
  { header: 'Feedback',       emit: (a) => (a.formData?.feedback as unknown) ?? '' },
  { header: 'Created At',     emit: (a) => (a.submittedAt ? new Date(a.submittedAt).toISOString() : '') },
  { header: 'Tags',           emit: (a) => (a.tags ?? []).filter((t) => !LEGACY_TAGS.has(t)) },
];

function formatCell(v: unknown): string {
  // Array values (e.g. projectTypes, provinces, decisionDrivers) join with `; `
  // (semicolon + space), per task spec — using `,` would break CSV columns.
  if (Array.isArray(v)) return v.map((x) => String(x ?? '')).join('; ');
  if (v === null || v === undefined) return '';
  return String(v);
}

function safeCell(v: unknown): string {
  let s = formatCell(v).replace(/"/g, '""');
  // Formula-injection prevention (spec §6.8 last sentence). Single-quote prefix
  // is the standard convention; Excel/Sheets render the literal value.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s}"`;
}

function getProfileCellValue(app: Application, key: string): unknown {
  if (key === '__hasCv') {
    const has = Array.isArray(app.attachments)
      && app.attachments.some((x) => x?.field === 'cv');
    return has ? 'Yes' : '';
  }
  return (app.formData ?? {})[key];
}

export function exportCsv(apps: Application[], filename: string): void {
  // Spec §6.8 — only emit a profile's column block if at least one application
  // of that profile exists in the input set. Old applications missing a key
  // render an empty cell (handled via `formatCell`).
  const profilesPresent = new Set<ProfileCategory>(apps.map((a) => a.userType));
  const activeGroups = PROFILE_ORDER
    .filter((p) => profilesPresent.has(p))
    .map((p) => [p, PROFILE_COLUMN_GROUPS[p]] as const);

  const headers = [
    ...UNIVERSAL_COLUMNS.map((c) => c.header),
    ...activeGroups.flatMap(([, cols]) => cols.map((c) => c.header)),
  ];

  const rows = apps.map((app) => {
    const universalRow = UNIVERSAL_COLUMNS.map((c) => c.emit(app));
    const profileCells = activeGroups.flatMap(([profile, cols]) => {
      // Only the row's own profile contributes values; other groups stay empty.
      if (app.userType !== profile) return cols.map(() => '');
      return cols.map((c) => getProfileCellValue(app, c.key));
    });
    return [...universalRow, ...profileCells];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map(safeCell).join(','))
    .join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
