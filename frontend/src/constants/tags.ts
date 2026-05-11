/* ---------------------------------------------------------------
   Intelligence tag labels — keep aligned with the auto-tag engine
   in `frontend/src/utils/auto-tag.ts` and the spec §9 ruleset.
   ---------------------------------------------------------------*/

export const TAG_LABELS: Record<string, string> = {
  // ── Universal activity (spec §9.1) ──
  ACTIVELY_LOOKING: 'Actively Looking',
  OPEN_TO_OPPORTUNITY: 'Open to Opportunity',
  LOW_INTENT: 'Low Intent',

  // ── Per-profile (spec §9.2) ──
  // developer
  SHOVEL_READY: 'Shovel Ready',
  FUNDING_GAP: 'Funding Gap',
  HIGH_VALUE: 'High Value',
  STUDENT_FOCUS: 'Student Focus',
  // landowner
  LAND_SELLER: 'Sellers',
  LAND_DEVELOPER: 'Developers',
  LAND_JV: 'JV',
  LAND_INCOME: 'Income',
  WORK_STARTED: 'Work Started',
  // investor
  LARGE_INVESTOR: 'Large Investor',
  EQUITY_INVESTOR: 'Equity',
  DEBT_FUNDER: 'Debt',
  JV_PARTNER: 'JV',
  ACTIVE_DEPLOYER: 'Active Deployer',
  // student operator
  LARGE_OPERATOR: 'Large Operator',
  MID_OPERATOR: 'Mid-size Operator',
  HIGH_OCCUPANCY: 'High Occupancy',
  GROWTH_FOCUS: 'Growth Focus',
  // professional
  SENIOR_PRO: 'Senior',
  MULTI_PROVINCE: 'Multi-province',
  STUDENT_ACC_EXP: 'Student Acc. Experience',
  MAJOR_PROJECTS: 'Major Projects',
  INDEPENDENT: 'Independent',
  // aspiring
  HAS_LAND: 'Has Land',
  READY_NOW: 'Ready Now',
  NEEDS_FUNDING: 'Needs Funding',
  NEEDS_KNOWLEDGE: 'Needs Knowledge',

  // ── Composites (spec §9.3 + §9.4) ──
  PIPELINE_READY: 'Pipeline Ready',
  HOT_INVESTOR: 'Hot Investor',
  INSTITUTIONAL_OPERATOR: 'Institutional Operator',
  INSTITUTIONAL_GRADE: 'Institutional Grade',

  // Retained legacy label (still emitted via composites in some paths).
  LARGE_CAPITAL: 'Large Capital',
};

/**
 * Legacy tags from the previous question set (spec §9.5).
 * These remain on existing documents but MUST never render in the admin
 * UI (no chips, no badges) and MUST never be emitted by the auto-tag
 * engine for new submissions. The underlying data is preserved — only
 * presentation is filtered.
 */
export const LEGACY_TAGS: ReadonlySet<string> = new Set([
  'LAND_SECURED',
  'FUNDING_STAGE',
  'MID_VALUE',
  'SEEKS_EQUITY',
  'SEEKS_DEBT',
  'FUNDED_BEFORE',
  'INSTITUTIONAL_TRACK',
  'EXPERIENCED',
  'UNI_ACCREDITED',
  'NSFAS_ACCREDITED',
  'REGISTERED',
  'LARGE_SCALE',
  'INVESTOR',
]);

/** Convenience filter — strips legacy tags before rendering. NEVER mutate the source. */
export function visibleTags(tags: readonly string[] | undefined | null): string[] {
  if (!tags) return [];
  return tags.filter((t) => !LEGACY_TAGS.has(t));
}
