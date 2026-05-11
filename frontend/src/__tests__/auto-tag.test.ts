/* ---------------------------------------------------------------
   Client auto-tag mirror — covers every rule in spec §9.1–9.4 and
   asserts no §9.5 legacy tag is ever emitted.
   ---------------------------------------------------------------*/

import { describe, it, expect } from 'vitest';
import { autoTag } from '../utils/auto-tag.ts';

const LEGACY_TAGS = [
  'LAND_SECURED', 'FUNDING_STAGE', 'MID_VALUE', 'SEEKS_EQUITY', 'SEEKS_DEBT',
  'FUNDED_BEFORE', 'INSTITUTIONAL_TRACK', 'EXPERIENCED', 'UNI_ACCREDITED',
  'NSFAS_ACCREDITED', 'REGISTERED', 'LARGE_SCALE', 'INVESTOR',
];

describe('autoTag — §9.1 universal activityLevel tags', () => {
  it('emits ACTIVELY_LOOKING for "Actively looking"', () => {
    expect(autoTag('developer', { activityLevel: 'Actively looking' })).toContain('ACTIVELY_LOOKING');
  });
  it('emits OPEN_TO_OPPORTUNITY for "Open to the right opportunity"', () => {
    expect(autoTag('developer', { activityLevel: 'Open to the right opportunity' })).toContain('OPEN_TO_OPPORTUNITY');
  });
  it('emits LOW_INTENT for "Not actively looking"', () => {
    expect(autoTag('developer', { activityLevel: 'Not actively looking' })).toContain('LOW_INTENT');
  });
  it('emits no activity tag when activityLevel is missing', () => {
    const tags = autoTag('developer', {});
    expect(tags).not.toContain('ACTIVELY_LOOKING');
    expect(tags).not.toContain('OPEN_TO_OPPORTUNITY');
    expect(tags).not.toContain('LOW_INTENT');
  });
});

describe('autoTag — §9.2 developer rules', () => {
  it('SHOVEL_READY for Construction-ready', () => {
    expect(autoTag('developer', { developmentStage: 'Construction-ready' })).toContain('SHOVEL_READY');
  });
  it('SHOVEL_READY for Under construction', () => {
    expect(autoTag('developer', { developmentStage: 'Under construction' })).toContain('SHOVEL_READY');
  });
  it('FUNDING_GAP for "No funding secured"', () => {
    expect(autoTag('developer', { fundingPosition: 'No funding secured' })).toContain('FUNDING_GAP');
  });
  it('FUNDING_GAP for "In discussions"', () => {
    expect(autoTag('developer', { fundingPosition: 'In discussions' })).toContain('FUNDING_GAP');
  });
  it('HIGH_VALUE for R20M–R100M', () => {
    expect(autoTag('developer', { projectValue: 'R20M–R100M' })).toContain('HIGH_VALUE');
  });
  it('HIGH_VALUE for R100M+', () => {
    expect(autoTag('developer', { projectValue: 'R100M+' })).toContain('HIGH_VALUE');
  });
  it('STUDENT_FOCUS when developmentTypes includes Student Accommodation', () => {
    expect(autoTag('developer', { developmentTypes: ['Residential', 'Student Accommodation'] })).toContain('STUDENT_FOCUS');
  });
});

describe('autoTag — §9.2 landowner rules', () => {
  it('LAND_SELLER for outcome=Sell', () => {
    expect(autoTag('landowner', { landOutcome: 'Sell' })).toContain('LAND_SELLER');
  });
  it('LAND_DEVELOPER for outcome=Develop', () => {
    expect(autoTag('landowner', { landOutcome: 'Develop' })).toContain('LAND_DEVELOPER');
  });
  it('LAND_JV for outcome=Partner', () => {
    expect(autoTag('landowner', { landOutcome: 'Partner' })).toContain('LAND_JV');
  });
  it('LAND_INCOME for outcome=Generate income', () => {
    expect(autoTag('landowner', { landOutcome: 'Generate income' })).toContain('LAND_INCOME');
  });
  it('WORK_STARTED for startedDevWork=Yes', () => {
    expect(autoTag('landowner', { startedDevWork: 'Yes' })).toContain('WORK_STARTED');
  });
});

describe('autoTag — §9.2 investor rules', () => {
  it('LARGE_INVESTOR for R10M–R20M', () => {
    expect(autoTag('investor', { investmentRange: 'R10M–R20M' })).toContain('LARGE_INVESTOR');
  });
  it('LARGE_INVESTOR for R20M+', () => {
    expect(autoTag('investor', { investmentRange: 'R20M+' })).toContain('LARGE_INVESTOR');
  });
  it('EQUITY_INVESTOR when approach includes Equity', () => {
    expect(autoTag('investor', { investmentApproach: ['Equity', 'JV'] })).toContain('EQUITY_INVESTOR');
  });
  it('DEBT_FUNDER when approach includes Debt', () => {
    expect(autoTag('investor', { investmentApproach: ['Debt'] })).toContain('DEBT_FUNDER');
  });
  it('JV_PARTNER when approach includes JV', () => {
    expect(autoTag('investor', { investmentApproach: ['JV'] })).toContain('JV_PARTNER');
  });
  it('ACTIVE_DEPLOYER for capitalDeployment=Active', () => {
    expect(autoTag('investor', { capitalDeployment: 'Active' })).toContain('ACTIVE_DEPLOYER');
  });
});

describe('autoTag — §9.2 student operator rules', () => {
  it('LARGE_OPERATOR for portfolioSize=500+ beds', () => {
    expect(autoTag('student', { portfolioSize: '500+ beds' })).toContain('LARGE_OPERATOR');
  });
  it('MID_OPERATOR for 51–200 beds', () => {
    expect(autoTag('student', { portfolioSize: '51–200 beds' })).toContain('MID_OPERATOR');
  });
  it('MID_OPERATOR for 201–500 beds', () => {
    expect(autoTag('student', { portfolioSize: '201–500 beds' })).toContain('MID_OPERATOR');
  });
  it('HIGH_OCCUPANCY for "Above 90%"', () => {
    expect(autoTag('student', { occupancyLevel: 'Above 90%' })).toContain('HIGH_OCCUPANCY');
  });
  it('HIGH_OCCUPANCY for "High"', () => {
    expect(autoTag('student', { occupancyLevel: 'High' })).toContain('HIGH_OCCUPANCY');
  });
  it('GROWTH_FOCUS for opChallenge=Growth', () => {
    expect(autoTag('student', { opChallenge: 'Growth' })).toContain('GROWTH_FOCUS');
  });
});

describe('autoTag — §9.2 professional rules', () => {
  it('SENIOR_PRO for experienceLevel=Senior (10+ years)', () => {
    expect(autoTag('professional', { experienceLevel: 'Senior (10+ years)' })).toContain('SENIOR_PRO');
  });
  it('MULTI_PROVINCE when provinces.length >= 3', () => {
    expect(autoTag('professional', { provinces: ['Gauteng', 'KZN', 'Western Cape'] })).toContain('MULTI_PROVINCE');
  });
  it('does NOT emit MULTI_PROVINCE for provinces.length < 3', () => {
    expect(autoTag('professional', { provinces: ['Gauteng', 'KZN'] })).not.toContain('MULTI_PROVINCE');
  });
  it('STUDENT_ACC_EXP when projectTypes includes Student Accommodation', () => {
    expect(autoTag('professional', { projectTypes: ['Residential', 'Student Accommodation'] })).toContain('STUDENT_ACC_EXP');
  });
  it('MAJOR_PROJECTS for avgProjectSize="Major (R50M+)"', () => {
    expect(autoTag('professional', { avgProjectSize: 'Major (R50M+)' })).toContain('MAJOR_PROJECTS');
  });
  it('INDEPENDENT for workStructure=Independent', () => {
    expect(autoTag('professional', { workStructure: 'Independent' })).toContain('INDEPENDENT');
  });
});

describe('autoTag — §9.2 aspiring rules', () => {
  it('HAS_LAND for hasLandAccess=Yes', () => {
    expect(autoTag('aspiring', { hasLandAccess: 'Yes' })).toContain('HAS_LAND');
  });
  it('READY_NOW for realisticStart=Immediately', () => {
    expect(autoTag('aspiring', { realisticStart: 'Immediately' })).toContain('READY_NOW');
  });
  it('NEEDS_FUNDING for holdingBack=Funding', () => {
    expect(autoTag('aspiring', { holdingBack: 'Funding' })).toContain('NEEDS_FUNDING');
  });
  it('NEEDS_KNOWLEDGE for holdingBack=Knowledge', () => {
    expect(autoTag('aspiring', { holdingBack: 'Knowledge' })).toContain('NEEDS_KNOWLEDGE');
  });
});

describe('autoTag — §9.3 composite deal-room signals', () => {
  it('PIPELINE_READY only when developer SHOVEL_READY + HIGH_VALUE + ACTIVELY_LOOKING', () => {
    const tags = autoTag('developer', {
      developmentStage: 'Construction-ready',
      projectValue: 'R100M+',
      activityLevel: 'Actively looking',
    });
    expect(tags).toContain('PIPELINE_READY');
  });
  it('PIPELINE_READY does NOT fire when one signal is missing (no activity)', () => {
    const tags = autoTag('developer', {
      developmentStage: 'Construction-ready',
      projectValue: 'R100M+',
    });
    expect(tags).not.toContain('PIPELINE_READY');
  });
  it('HOT_INVESTOR when investor LARGE_INVESTOR + ACTIVE_DEPLOYER', () => {
    const tags = autoTag('investor', {
      investmentRange: 'R20M+',
      capitalDeployment: 'Active',
    });
    expect(tags).toContain('HOT_INVESTOR');
  });
  it('INSTITUTIONAL_OPERATOR when student LARGE_OPERATOR + HIGH_OCCUPANCY', () => {
    const tags = autoTag('student', {
      portfolioSize: '500+ beds',
      occupancyLevel: 'Above 90%',
    });
    expect(tags).toContain('INSTITUTIONAL_OPERATOR');
  });
});

describe('autoTag — §9.4 INSTITUTIONAL_GRADE composite', () => {
  it('emits when developer HIGH_VALUE + STUDENT_FOCUS', () => {
    const tags = autoTag('developer', {
      projectValue: 'R100M+',
      developmentTypes: ['Student Accommodation'],
    });
    expect(tags).toContain('INSTITUTIONAL_GRADE');
  });
  it('does NOT emit for non-developer profiles', () => {
    const tags = autoTag('student', {
      projectValue: 'R100M+',
      developmentTypes: ['Student Accommodation'],
    });
    expect(tags).not.toContain('INSTITUTIONAL_GRADE');
  });
});

describe('autoTag — defensive behaviour', () => {
  it('returns [] for null formData', () => {
    expect(autoTag('developer', null)).toEqual([]);
  });
  it('returns [] for undefined formData', () => {
    expect(autoTag('developer', undefined)).toEqual([]);
  });
  it('returns [] for empty formData on every profile', () => {
    for (const p of ['developer', 'landowner', 'investor', 'student', 'professional', 'aspiring'] as const) {
      expect(autoTag(p, {})).toEqual([]);
    }
  });
  it('deduplicates tags', () => {
    const tags = autoTag('developer', {
      developmentStage: 'Construction-ready',
      projectValue: 'R100M+',
      activityLevel: 'Actively looking',
      developmentTypes: ['Student Accommodation'],
    });
    const unique = [...new Set(tags)];
    expect(tags.length).toBe(unique.length);
  });
});

describe('autoTag — §9.5 legacy tags are NEVER emitted', () => {
  // Build a maximal fixture that, on the OLD engine, would have produced
  // most of the §9.5 legacy tags. The new engine must produce zero of them.
  const fixtures: Array<[string, Record<string, unknown>]> = [
    ['developer', {
      developmentStage: 'Construction-ready', projectValue: 'R100M+',
      developmentTypes: ['Student Accommodation'], fundingPosition: 'No funding secured',
      activityLevel: 'Actively looking',
      // legacy keys — engine should ignore
      estimatedValue: 'R100m+', landStatus: 'Land Secured', projectStage: 'Funding Stage',
      seeking: ['Equity Partner', 'Debt Funding'], previousFunding: 'Institutional',
    }],
    ['landowner', {
      landOutcome: 'Sell', startedDevWork: 'Yes',
      // legacy keys
      landSize: '5,000 sqm', isServiced: 'Yes', zoningStatus: 'Commercial',
      developmentAppetite: 'Joint Venture', existingBond: 'No',
    }],
    ['investor', {
      investmentRange: 'R20M+', investmentApproach: ['Equity', 'Debt', 'JV'],
      capitalDeployment: 'Active',
      // legacy keys
      investmentAmount: 'R100m+', priorInvestmentExperience: 'Yes',
      investmentFocus: ['Student Accommodation'], decisionTimeline: 'Immediate',
    }],
    ['student', {
      portfolioSize: '500+ beds', occupancyLevel: 'Above 90%', opChallenge: 'Growth',
      // legacy
      totalBedCount: '500+', averageOccupancy: '95%+',
      universityPartnership: 'Yes', nsfasAccreditation: 'Fully accredited',
      supportNeeds: ['Capital raise / funding for expansion'],
      growthIntention: 'Grow significantly',
    }],
    ['professional', {
      experienceLevel: 'Senior (10+ years)',
      provinces: ['Gauteng', 'KZN', 'Western Cape'],
      projectTypes: ['Student Accommodation'], avgProjectSize: 'Major (R50M+)',
      workStructure: 'Independent',
      // legacy
      typicalProjectValue: 'R20m – R100m', registrationBody: 'SACAP',
      currentCapacity: 'Immediately available',
      associateDatabase: 'Yes — actively looking for project opportunities',
    }],
    ['aspiring', {
      hasLandAccess: 'Yes', realisticStart: 'Immediately', holdingBack: 'Funding',
    }],
  ];

  it.each(fixtures)('%s never emits a §9.5 legacy tag', (profile, fd) => {
    const tags = autoTag(profile, fd);
    for (const legacy of LEGACY_TAGS) {
      expect(tags).not.toContain(legacy);
    }
  });
});
