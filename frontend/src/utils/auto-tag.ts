/* ---------------------------------------------------------------
   Auto-tag mirror — matches backend/src/utils/autoTag.js rule-for-rule.
   Source of truth: docs/superpowers/specs/2026-05-11-onboarding-flow-update-design.md §9.
   Emits ONLY §9.1–9.4 tags; legacy §9.5 tags are never produced.
   Pure function: (userType, formData) → string[].
   Cross-engine parity covered by frontend/src/__tests__/auto-tag-parity.test.ts.
   ---------------------------------------------------------------*/

import type { ProfileCategory } from '../types/index.ts';

// ── Spec §7.2 / §14 — canonical activityLevel enum ──
const ACTIVITY_ACTIVELY = 'Actively looking';
const ACTIVITY_OPEN = 'Open to the right opportunity';
const ACTIVITY_LOW = 'Not actively looking';

type FD = Record<string, unknown>;

function asArray(v: unknown): unknown[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function includesValue(field: unknown, value: string): boolean {
  return asArray(field).includes(value);
}

export function autoTag(type: ProfileCategory | string, f: FD | undefined | null): string[] {
  if (!f || typeof f !== 'object') return [];
  const t = new Set<string>();

  // ── §9.1 Universal tags ──
  if (f.activityLevel === ACTIVITY_ACTIVELY) t.add('ACTIVELY_LOOKING');
  else if (f.activityLevel === ACTIVITY_OPEN) t.add('OPEN_TO_OPPORTUNITY');
  else if (f.activityLevel === ACTIVITY_LOW) t.add('LOW_INTENT');

  // ── §9.2 Per-profile tags ──
  if (type === 'developer') {
    if (['Construction-ready', 'Under construction'].includes(f.developmentStage as string)) t.add('SHOVEL_READY');
    if (['No funding secured', 'In discussions'].includes(f.fundingPosition as string)) t.add('FUNDING_GAP');
    if (['R20M–R100M', 'R100M+'].includes(f.projectValue as string)) t.add('HIGH_VALUE');
    if (includesValue(f.developmentTypes, 'Student Accommodation')) t.add('STUDENT_FOCUS');
  } else if (type === 'landowner') {
    if (f.landOutcome === 'Sell') t.add('LAND_SELLER');
    if (f.landOutcome === 'Develop') t.add('LAND_DEVELOPER');
    if (f.landOutcome === 'Partner') t.add('LAND_JV');
    if (f.landOutcome === 'Generate income') t.add('LAND_INCOME');
    if (f.startedDevWork === 'Yes') t.add('WORK_STARTED');
  } else if (type === 'investor') {
    if (['R10M–R20M', 'R20M+'].includes(f.investmentRange as string)) t.add('LARGE_INVESTOR');
    if (includesValue(f.investmentApproach, 'Equity')) t.add('EQUITY_INVESTOR');
    if (includesValue(f.investmentApproach, 'Debt')) t.add('DEBT_FUNDER');
    if (includesValue(f.investmentApproach, 'JV')) t.add('JV_PARTNER');
    if (f.capitalDeployment === 'Active') t.add('ACTIVE_DEPLOYER');
  } else if (type === 'student') {
    if (f.portfolioSize === '500+ beds') t.add('LARGE_OPERATOR');
    if (['51–200 beds', '201–500 beds'].includes(f.portfolioSize as string)) t.add('MID_OPERATOR');
    if (['Above 90%', 'High'].includes(f.occupancyLevel as string)) t.add('HIGH_OCCUPANCY');
    if (f.opChallenge === 'Growth') t.add('GROWTH_FOCUS');
  } else if (type === 'professional') {
    if (f.experienceLevel === 'Senior (10+ years)') t.add('SENIOR_PRO');
    if (Array.isArray(f.provinces) && (f.provinces as unknown[]).length >= 3) t.add('MULTI_PROVINCE');
    if (includesValue(f.projectTypes, 'Student Accommodation')) t.add('STUDENT_ACC_EXP');
    if (f.avgProjectSize === 'Major (R50M+)') t.add('MAJOR_PROJECTS');
    if (f.workStructure === 'Independent') t.add('INDEPENDENT');
  } else if (type === 'aspiring') {
    if (f.hasLandAccess === 'Yes') t.add('HAS_LAND');
    if (f.realisticStart === 'Immediately') t.add('READY_NOW');
    if (f.holdingBack === 'Funding') t.add('NEEDS_FUNDING');
    if (f.holdingBack === 'Knowledge') t.add('NEEDS_KNOWLEDGE');
  }

  // ── §9.3 Composite "deal-room" signals ──
  if (
    type === 'developer'
    && t.has('SHOVEL_READY') && t.has('HIGH_VALUE') && t.has('ACTIVELY_LOOKING')
  ) t.add('PIPELINE_READY');

  if (type === 'investor' && t.has('LARGE_INVESTOR') && t.has('ACTIVE_DEPLOYER')) {
    t.add('HOT_INVESTOR');
  }

  if (type === 'student' && t.has('LARGE_OPERATOR') && t.has('HIGH_OCCUPANCY')) {
    t.add('INSTITUTIONAL_OPERATOR');
  }

  // ── §9.4 INSTITUTIONAL_GRADE (kept distinct from PIPELINE_READY) ──
  if (type === 'developer' && t.has('HIGH_VALUE') && t.has('STUDENT_FOCUS')) {
    t.add('INSTITUTIONAL_GRADE');
  }

  return [...t];
}
