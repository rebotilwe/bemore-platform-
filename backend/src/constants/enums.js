/**
 * Enums — Shared constants between frontend and backend
 * Updated: Removed PBSA, added actual funders
 */

export const PROFILE_CATEGORIES = [
  'developer',
  'landowner',
  'investor',
  'student',
  'professional',
  'aspiring',
];

export const APPLICATION_STATUSES = [
  'new',
  'reviewing',
  'shortlisted',
  'invited',
  'funded',
];

// Updated: Replaced PBSA with actual institutional funders
export const FUNDER_NAMES = [
  'DBSA',
  'NHFC',
  'NEF',
  'SAIF',
];

export const SORTABLE_FIELDS = [
  'submittedAt',
  'updatedAt',
  'personal.surname',
  'status',
  'userType',
];

// Funder display names (for backend email templates)
export const FUNDER_DISPLAY_NAMES = {
  DBSA: 'Development Bank of Southern Africa',
  NHFC: 'National Housing Finance Corporation',
  NEF: 'National Empowerment Fund',
  SAIF: 'South African Infrastructure Fund',
};

// Report names
export const REPORT_NAMES = [
  'high-value-developers',
  'pipeline-ready-developers',
  'pipeline-ready-land',
  'institutional-grade-housing',
  'deal-room-shortlist',
];

// Helper to check if a funder is valid
export function isValidFunder(name) {
  return FUNDER_NAMES.includes(name);
}

// Helper to get funder display name
export function getFunderDisplayName(name) {
  return FUNDER_DISPLAY_NAMES[name] || name;
}