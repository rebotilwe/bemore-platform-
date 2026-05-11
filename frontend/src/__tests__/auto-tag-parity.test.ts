/* ---------------------------------------------------------------
   Cross-engine parity fixtures — feed each into client autoTag()
   and assert the expected tag set. The exact same fixtures will be
   consumed by the backend parity test (QA-2) via Jest, so the two
   engines must agree on every tag.
   ---------------------------------------------------------------*/

import { describe, it, expect } from 'vitest';
import { autoTag } from '../utils/auto-tag.ts';
import type { ProfileCategory } from '../types/index.ts';

interface Fixture {
  profile: ProfileCategory;
  formData: Record<string, unknown>;
  expected: string[];
}

const FIXTURES: Fixture[] = [
  {
    profile: 'developer',
    formData: {
      developmentStage: 'Construction-ready',
      developmentTypes: ['Student Accommodation'],
      projectValue: 'R100M+',
      fundingPosition: 'No funding secured',
      activityLevel: 'Actively looking',
    },
    expected: [
      'ACTIVELY_LOOKING', 'SHOVEL_READY', 'FUNDING_GAP', 'HIGH_VALUE',
      'STUDENT_FOCUS', 'PIPELINE_READY', 'INSTITUTIONAL_GRADE',
    ],
  },
  {
    profile: 'landowner',
    formData: {
      landOutcome: 'Sell',
      startedDevWork: 'Yes',
      activityLevel: 'Open to the right opportunity',
    },
    expected: ['OPEN_TO_OPPORTUNITY', 'LAND_SELLER', 'WORK_STARTED'],
  },
  {
    profile: 'investor',
    formData: {
      investmentRange: 'R20M+',
      investmentApproach: ['Equity', 'JV'],
      capitalDeployment: 'Active',
      activityLevel: 'Actively looking',
    },
    expected: [
      'ACTIVELY_LOOKING', 'LARGE_INVESTOR', 'EQUITY_INVESTOR', 'JV_PARTNER',
      'ACTIVE_DEPLOYER', 'HOT_INVESTOR',
    ],
  },
  {
    profile: 'student',
    formData: {
      portfolioSize: '500+ beds',
      occupancyLevel: 'Above 90%',
      opChallenge: 'Growth',
      activityLevel: 'Actively looking',
    },
    expected: [
      'ACTIVELY_LOOKING', 'LARGE_OPERATOR', 'HIGH_OCCUPANCY', 'GROWTH_FOCUS',
      'INSTITUTIONAL_OPERATOR',
    ],
  },
  {
    profile: 'professional',
    formData: {
      experienceLevel: 'Senior (10+ years)',
      provinces: ['Gauteng', 'KZN', 'Western Cape'],
      projectTypes: ['Student Accommodation'],
      avgProjectSize: 'Major (R50M+)',
      workStructure: 'Independent',
      activityLevel: 'Not actively looking',
    },
    expected: [
      'LOW_INTENT', 'SENIOR_PRO', 'MULTI_PROVINCE', 'STUDENT_ACC_EXP',
      'MAJOR_PROJECTS', 'INDEPENDENT',
    ],
  },
  {
    profile: 'aspiring',
    formData: {
      hasLandAccess: 'Yes',
      realisticStart: 'Immediately',
      holdingBack: 'Funding',
      activityLevel: 'Actively looking',
    },
    expected: ['ACTIVELY_LOOKING', 'HAS_LAND', 'READY_NOW', 'NEEDS_FUNDING'],
  },
];

describe('autoTag parity fixtures (client engine)', () => {
  it.each(FIXTURES)('$profile produces expected tag set', ({ profile, formData, expected }) => {
    const tags = autoTag(profile, formData);
    expect(new Set(tags)).toEqual(new Set(expected));
  });
});

// Export so the backend QA-2 parity test can consume the same source of truth.
export { FIXTURES };
