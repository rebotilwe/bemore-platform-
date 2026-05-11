/* ---------------------------------------------------------------
   Human-readable labels for `formData` field IDs, keyed per profile.
   Used by the admin lead detail modal to render new submissions.
   Unknown keys (legacy fields on old applications) fall through to
   `humanise(key)` — see `humaniseFieldKey()` below.
   Source: spec §7.2 + §6.6.
   ---------------------------------------------------------------*/

import type { ProfileCategory } from '../types/index.ts';

type LabelMap = Record<string, string>;

const universalLabels: LabelMap = {
  activityLevel: 'Activity Level',
  feedback: 'Feedback',
  notActiveReason: 'Why Not Active Right Now',
};

const developerLabels: LabelMap = {
  entityType: 'Developing As',
  developmentStage: 'Development Stage',
  developmentTypes: 'Development Types',
  projectValue: 'Typical Project Value',
  fundingPosition: 'Funding Position',
  biggestConstraint: 'Biggest Constraint',
  biggestConstraintOther: 'Constraint (Other)',
  whatMatters: 'What Matters Most',
  ...universalLabels,
};

const landownerLabels: LabelMap = {
  landLocation: 'Land Location',
  landSize: 'Land Size',
  landOutcome: 'Outcome Sought',
  zoning: 'Zoning Status',
  startedDevWork: 'Started Development Work',
  whatPreventsProgress: 'What Prevents Progress',
  ...universalLabels,
};

const investorLabels: LabelMap = {
  entityType: 'Investing As',
  investmentOpportunities: 'Investment Opportunities',
  investmentRange: 'Investment Range',
  investmentApproach: 'Investment Approach',
  decisionDrivers: 'Decision Drivers',
  capitalDeployment: 'Capital Deployment',
  ...universalLabels,
};

const studentLabels: LabelMap = {
  portfolioSize: 'Portfolio Size (Beds)',
  portfolioLocations: 'Operating Provinces',
  opChallenge: 'Operational Challenge',
  occupancyLevel: 'Occupancy Level',
  scaleLimit: 'Scale Limit',
  ...universalLabels,
};

const professionalLabels: LabelMap = {
  primaryRole: 'Primary Role',
  experienceLevel: 'Experience Level',
  provinces: 'Active Provinces',
  workStructure: 'Work Structure',
  companyPractice: 'Company / Practice',
  projectTypes: 'Project Types',
  avgProjectSize: 'Average Project Size',
  workStyle: 'Work Style',
  proWhatMatters: 'What Matters Most',
  notActiveReasonOther: 'Why Not Active (Other)',
  ...universalLabels,
};

const aspiringLabels: LabelMap = {
  involvedBefore: 'Involved in Development Before',
  hasLandAccess: 'Has Land Access',
  aspiringDevType: 'Development Type of Interest',
  holdingBack: 'Holding Back',
  realisticStart: 'Realistic Start Time',
  ...universalLabels,
};

export const PROFILE_FIELD_LABELS: Record<ProfileCategory, LabelMap> = {
  developer: developerLabels,
  landowner: landownerLabels,
  investor: investorLabels,
  student: studentLabels,
  professional: professionalLabels,
  aspiring: aspiringLabels,
};

/**
 * Fall-back label generator for unknown / legacy field keys.
 * Splits camelCase + snake_case + kebab-case into Title Case words.
 */
export function humaniseFieldKey(key: string): string {
  if (!key) return '';
  // Insert a space before each uppercase letter, normalise separators.
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  return spaced
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

export function getFieldLabel(profile: ProfileCategory, key: string): string {
  const map = PROFILE_FIELD_LABELS[profile];
  return (map && map[key]) || humaniseFieldKey(key);
}
