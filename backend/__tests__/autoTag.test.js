/**
 * BE-5 — Auto-tagging engine unit tests.
 *
 * Source of truth: spec §9. One unit test per rule (universal + per-profile +
 * composites + a negative test asserting NO §9.5 legacy tag is emitted).
 *
 * Pure-function tests — no Mongoose, no DB.
 */
import { autoTag } from '../src/utils/autoTag.js';

const ACTIVE = 'Actively looking';
const OPEN = 'Open to the right opportunity';
const LOW = 'Not actively looking';

// Spec §9.5 — these tags must NEVER be emitted by the new engine.
const LEGACY_TAGS = [
  'LAND_SECURED', 'FUNDING_STAGE', 'MID_VALUE', 'SEEKS_EQUITY', 'SEEKS_DEBT',
  'FUNDED_BEFORE', 'INSTITUTIONAL_TRACK', 'EXPERIENCED', 'UNI_ACCREDITED',
  'NSFAS_ACCREDITED', 'REGISTERED', 'LARGE_SCALE', 'INVESTOR',
];

describe('autoTag — defensive', () => {
  it('returns [] when formData is undefined / null / not an object', () => {
    expect(autoTag('developer', undefined)).toEqual([]);
    expect(autoTag('developer', null)).toEqual([]);
    expect(autoTag('developer', 'string')).toEqual([]);
  });

  it('returns [] when formData has no relevant fields', () => {
    expect(autoTag('developer', {})).toEqual([]);
    expect(autoTag('aspiring', { unknownField: 'x' })).toEqual([]);
  });

  it('never crashes on partial / weird userType', () => {
    expect(autoTag('unknown-profile', { activityLevel: ACTIVE })).toEqual(['ACTIVELY_LOOKING']);
  });
});

describe('autoTag — §9.1 universal tags', () => {
  it('ACTIVELY_LOOKING when activityLevel = Actively looking', () => {
    expect(autoTag('developer', { activityLevel: ACTIVE })).toContain('ACTIVELY_LOOKING');
  });
  it('OPEN_TO_OPPORTUNITY when activityLevel = Open to the right opportunity', () => {
    expect(autoTag('developer', { activityLevel: OPEN })).toContain('OPEN_TO_OPPORTUNITY');
  });
  it('LOW_INTENT when activityLevel = Not actively looking', () => {
    expect(autoTag('developer', { activityLevel: LOW })).toContain('LOW_INTENT');
  });
});

describe('autoTag — §9.2 developer rules', () => {
  it('SHOVEL_READY for Construction-ready or Under construction', () => {
    expect(autoTag('developer', { developmentStage: 'Construction-ready' })).toContain('SHOVEL_READY');
    expect(autoTag('developer', { developmentStage: 'Under construction' })).toContain('SHOVEL_READY');
  });
  it('FUNDING_GAP for No funding secured or In discussions', () => {
    expect(autoTag('developer', { fundingPosition: 'No funding secured' })).toContain('FUNDING_GAP');
    expect(autoTag('developer', { fundingPosition: 'In discussions' })).toContain('FUNDING_GAP');
  });
  it('HIGH_VALUE for projectValue R20M–R100M or R100M+', () => {
    expect(autoTag('developer', { projectValue: 'R20M–R100M' })).toContain('HIGH_VALUE');
    expect(autoTag('developer', { projectValue: 'R100M+' })).toContain('HIGH_VALUE');
  });
  it('STUDENT_FOCUS when developmentTypes includes Student Accommodation', () => {
    expect(autoTag('developer', { developmentTypes: ['Student Accommodation'] })).toContain('STUDENT_FOCUS');
  });
  it('does NOT emit HIGH_VALUE for unrelated value strings', () => {
    expect(autoTag('developer', { projectValue: 'R5M–R10M' })).not.toContain('HIGH_VALUE');
  });
});

describe('autoTag — §9.2 landowner rules', () => {
  it('LAND_SELLER when landOutcome = Sell', () => {
    expect(autoTag('landowner', { landOutcome: 'Sell' })).toContain('LAND_SELLER');
  });
  it('LAND_DEVELOPER when landOutcome = Develop', () => {
    expect(autoTag('landowner', { landOutcome: 'Develop' })).toContain('LAND_DEVELOPER');
  });
  it('LAND_JV when landOutcome = Partner', () => {
    expect(autoTag('landowner', { landOutcome: 'Partner' })).toContain('LAND_JV');
  });
  it('LAND_INCOME when landOutcome = Generate income', () => {
    expect(autoTag('landowner', { landOutcome: 'Generate income' })).toContain('LAND_INCOME');
  });
  it('WORK_STARTED when startedDevWork = Yes', () => {
    expect(autoTag('landowner', { startedDevWork: 'Yes' })).toContain('WORK_STARTED');
  });
});

describe('autoTag — §9.2 investor rules', () => {
  it('LARGE_INVESTOR for R10M–R20M or R20M+', () => {
    expect(autoTag('investor', { investmentRange: 'R10M–R20M' })).toContain('LARGE_INVESTOR');
    expect(autoTag('investor', { investmentRange: 'R20M+' })).toContain('LARGE_INVESTOR');
  });
  it('EQUITY_INVESTOR / DEBT_FUNDER / JV_PARTNER from investmentApproach[]', () => {
    expect(autoTag('investor', { investmentApproach: ['Equity'] })).toContain('EQUITY_INVESTOR');
    expect(autoTag('investor', { investmentApproach: ['Debt'] })).toContain('DEBT_FUNDER');
    expect(autoTag('investor', { investmentApproach: ['JV'] })).toContain('JV_PARTNER');
  });
  it('ACTIVE_DEPLOYER when capitalDeployment = Active', () => {
    expect(autoTag('investor', { capitalDeployment: 'Active' })).toContain('ACTIVE_DEPLOYER');
  });
  it('investor base no longer auto-emits legacy INVESTOR tag', () => {
    expect(autoTag('investor', { investmentRange: 'R20M+' })).not.toContain('INVESTOR');
  });
});

describe('autoTag — §9.2 student-operator rules', () => {
  it('LARGE_OPERATOR when portfolioSize = 500+ beds', () => {
    expect(autoTag('student', { portfolioSize: '500+ beds' })).toContain('LARGE_OPERATOR');
  });
  it('MID_OPERATOR for 51–200 beds or 201–500 beds', () => {
    expect(autoTag('student', { portfolioSize: '51–200 beds' })).toContain('MID_OPERATOR');
    expect(autoTag('student', { portfolioSize: '201–500 beds' })).toContain('MID_OPERATOR');
  });
  it('HIGH_OCCUPANCY for Above 90% or High', () => {
    expect(autoTag('student', { occupancyLevel: 'Above 90%' })).toContain('HIGH_OCCUPANCY');
    expect(autoTag('student', { occupancyLevel: 'High' })).toContain('HIGH_OCCUPANCY');
  });
  it('GROWTH_FOCUS when opChallenge = Growth', () => {
    expect(autoTag('student', { opChallenge: 'Growth' })).toContain('GROWTH_FOCUS');
  });
});

describe('autoTag — §9.2 professional rules', () => {
  it('SENIOR_PRO when experienceLevel = Senior (10+ years)', () => {
    expect(autoTag('professional', { experienceLevel: 'Senior (10+ years)' })).toContain('SENIOR_PRO');
  });
  it('MULTI_PROVINCE when provinces.length >= 3', () => {
    expect(autoTag('professional', { provinces: ['GP', 'WC', 'KZN'] })).toContain('MULTI_PROVINCE');
    expect(autoTag('professional', { provinces: ['GP', 'WC'] })).not.toContain('MULTI_PROVINCE');
  });
  it('STUDENT_ACC_EXP when projectTypes includes Student Accommodation', () => {
    expect(autoTag('professional', { projectTypes: ['Residential', 'Student Accommodation'] }))
      .toContain('STUDENT_ACC_EXP');
  });
  it('MAJOR_PROJECTS when avgProjectSize = Major (R50M+)', () => {
    expect(autoTag('professional', { avgProjectSize: 'Major (R50M+)' })).toContain('MAJOR_PROJECTS');
  });
  it('INDEPENDENT when workStructure = Independent', () => {
    expect(autoTag('professional', { workStructure: 'Independent' })).toContain('INDEPENDENT');
  });
});

describe('autoTag — §9.2 aspiring rules', () => {
  it('HAS_LAND when hasLandAccess = Yes', () => {
    expect(autoTag('aspiring', { hasLandAccess: 'Yes' })).toContain('HAS_LAND');
  });
  it('READY_NOW when realisticStart = Immediately', () => {
    expect(autoTag('aspiring', { realisticStart: 'Immediately' })).toContain('READY_NOW');
  });
  it('NEEDS_FUNDING when holdingBack = Funding', () => {
    expect(autoTag('aspiring', { holdingBack: 'Funding' })).toContain('NEEDS_FUNDING');
  });
  it('NEEDS_KNOWLEDGE when holdingBack = Knowledge', () => {
    expect(autoTag('aspiring', { holdingBack: 'Knowledge' })).toContain('NEEDS_KNOWLEDGE');
  });
});

describe('autoTag — §9.3 composite "deal-room" signals', () => {
  it('PIPELINE_READY only fires when SHOVEL_READY + HIGH_VALUE + ACTIVELY_LOOKING all present', () => {
    const tags = autoTag('developer', {
      developmentStage: 'Construction-ready',
      projectValue: 'R100M+',
      activityLevel: ACTIVE,
    });
    expect(tags).toEqual(expect.arrayContaining(['SHOVEL_READY', 'HIGH_VALUE', 'ACTIVELY_LOOKING', 'PIPELINE_READY']));
  });
  it('PIPELINE_READY does NOT fire when only two of three contributing tags present', () => {
    const tags = autoTag('developer', {
      developmentStage: 'Construction-ready',
      projectValue: 'R100M+',
      activityLevel: OPEN,
    });
    expect(tags).not.toContain('PIPELINE_READY');
  });
  it('HOT_INVESTOR fires when LARGE_INVESTOR + ACTIVE_DEPLOYER both present', () => {
    const tags = autoTag('investor', {
      investmentRange: 'R20M+',
      capitalDeployment: 'Active',
    });
    expect(tags).toContain('HOT_INVESTOR');
  });
  it('INSTITUTIONAL_OPERATOR fires when LARGE_OPERATOR + HIGH_OCCUPANCY both present', () => {
    const tags = autoTag('student', {
      portfolioSize: '500+ beds',
      occupancyLevel: 'Above 90%',
    });
    expect(tags).toContain('INSTITUTIONAL_OPERATOR');
  });
});

describe('autoTag — §9.4 INSTITUTIONAL_GRADE', () => {
  it('fires when HIGH_VALUE + STUDENT_FOCUS both present (developer)', () => {
    const tags = autoTag('developer', {
      projectValue: 'R100M+',
      developmentTypes: ['Student Accommodation'],
    });
    expect(tags).toContain('INSTITUTIONAL_GRADE');
  });
  it('does not fire on student profile with similar fields', () => {
    expect(autoTag('student', { projectValue: 'R100M+', developmentTypes: ['Student Accommodation'] }))
      .not.toContain('INSTITUTIONAL_GRADE');
  });
});

describe('autoTag — §9.5 legacy tags MUST NEVER be emitted', () => {
  it.each(LEGACY_TAGS)('does not emit %s under any common new-shape submission', (legacyTag) => {
    const fixtures = [
      { type: 'developer', f: { developmentStage: 'Construction-ready', projectValue: 'R100M+', activityLevel: ACTIVE, fundingPosition: 'No funding secured', developmentTypes: ['Student Accommodation'] } },
      { type: 'landowner', f: { landOutcome: 'Sell', startedDevWork: 'Yes', activityLevel: OPEN } },
      { type: 'investor', f: { investmentRange: 'R20M+', investmentApproach: ['Equity', 'Debt', 'JV'], capitalDeployment: 'Active', activityLevel: ACTIVE } },
      { type: 'student', f: { portfolioSize: '500+ beds', occupancyLevel: 'Above 90%', opChallenge: 'Growth', activityLevel: ACTIVE } },
      { type: 'professional', f: { experienceLevel: 'Senior (10+ years)', provinces: ['GP', 'WC', 'KZN'], projectTypes: ['Student Accommodation'], avgProjectSize: 'Major (R50M+)', workStructure: 'Independent', activityLevel: ACTIVE } },
      { type: 'aspiring', f: { hasLandAccess: 'Yes', realisticStart: 'Immediately', holdingBack: 'Funding', activityLevel: ACTIVE } },
    ];
    for (const fx of fixtures) {
      expect(autoTag(fx.type, fx.f)).not.toContain(legacyTag);
    }
  });

  it('legacy formData shape (old keys) produces empty tag set on new engine', () => {
    expect(autoTag('developer', {
      landStatus: 'Land Secured',
      projectStage: 'Funding Stage',
      estimatedValue: 'R20m – R100m',
      previousFunding: 'Institutional',
    })).toEqual([]);
  });
});
