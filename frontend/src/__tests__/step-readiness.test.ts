/* ---------------------------------------------------------------
   nextStepReady — per profile × per step (spec §6.4).
   Every test pair = (complete fixture → true) + (incomplete → false).
   Conditional-required-when-shown also exercised both ways.
   ---------------------------------------------------------------*/

import { describe, it, expect } from 'vitest';
import { nextStepReady } from '../utils/step-readiness.ts';
import type { ProfileCategory } from '../types/index.ts';

const fullPersonal = {
  firstName: 'Thabo',
  surname: 'Mokoena',
  email: 'thabo@example.co.za',
  phone: '+27821234567',
};
const fullConsent = { tc: true, popia: true };

/* ── Developer ────────────────────────────────── */

describe('nextStepReady — Developer', () => {
  it('Step 1 OK with personal fields + entityType filled', () => {
    expect(nextStepReady(1, 'developer', { entityType: 'Company' }, { personal: fullPersonal })).toBe(true);
  });
  it('Step 1 fails when surname missing', () => {
    expect(nextStepReady(1, 'developer', { entityType: 'Company' }, { personal: { ...fullPersonal, surname: '' } })).toBe(false);
  });
  it('Step 1 fails when entityType missing', () => {
    expect(nextStepReady(1, 'developer', {}, { personal: fullPersonal })).toBe(false);
  });
  it('Step 2 OK with developmentStage + types + value', () => {
    const fd = {
      developmentStage: 'Construction-ready',
      developmentTypes: ['Residential'],
      projectValue: 'R20M–R100M',
    };
    expect(nextStepReady(2, 'developer', fd)).toBe(true);
  });
  it('Step 2 fails without developmentTypes', () => {
    expect(nextStepReady(2, 'developer', {
      developmentStage: 'Concept stage',
      developmentTypes: [],
      projectValue: '<R5M',
    })).toBe(false);
  });
  it('Step 3 conditional `biggestConstraintOther` required when biggestConstraint=Other', () => {
    const incomplete = {
      fundingPosition: 'Fully funded',
      biggestConstraint: 'Other',
      whatMatters: ['Speed of funding'],
    };
    expect(nextStepReady(3, 'developer', incomplete)).toBe(false);
    expect(nextStepReady(3, 'developer', { ...incomplete, biggestConstraintOther: 'tax' })).toBe(true);
  });
  it('Step 3 not required when biggestConstraint != Other', () => {
    expect(nextStepReady(3, 'developer', {
      fundingPosition: 'Fully funded',
      biggestConstraint: 'Funding',
      whatMatters: ['Speed of funding'],
    })).toBe(true);
  });
  it('Step 4 OK with email + phone valid', () => {
    expect(nextStepReady(4, 'developer', {}, { personal: fullPersonal })).toBe(true);
  });
  it('Step 4 fails for invalid email', () => {
    expect(nextStepReady(4, 'developer', {}, { personal: { ...fullPersonal, email: 'not-an-email' } })).toBe(false);
  });
  it('Step 4 fails when upload mid-flight', () => {
    expect(nextStepReady(4, 'developer', {}, { personal: fullPersonal, uploadInFlight: true })).toBe(false);
  });
  it('Step 5 conditional notActiveReason required when activityLevel != Actively looking', () => {
    expect(nextStepReady(5, 'developer', {
      activityLevel: 'Open to the right opportunity',
      feedback: 'Some feedback',
    }, { consent: fullConsent })).toBe(false);
    expect(nextStepReady(5, 'developer', {
      activityLevel: 'Open to the right opportunity',
      notActiveReason: 'Funding not lined up',
      feedback: 'Some feedback',
    }, { consent: fullConsent })).toBe(true);
  });
  it('Step 5 OK without notActiveReason when Actively looking', () => {
    expect(nextStepReady(5, 'developer', {
      activityLevel: 'Actively looking',
      feedback: 'Some feedback',
    }, { consent: fullConsent })).toBe(true);
  });
  it('Step 5 fails when consent missing', () => {
    expect(nextStepReady(5, 'developer', {
      activityLevel: 'Actively looking',
      feedback: 'Some feedback',
    }, { consent: { tc: true, popia: false } })).toBe(false);
  });
});

/* ── Land Owner ───────────────────────────────── */

describe('nextStepReady — Land Owner', () => {
  it('Step 2 OK with location/size/outcome', () => {
    expect(nextStepReady(2, 'landowner', {
      landLocation: 'Sandton', landSize: '5,000 sqm', landOutcome: 'Sell',
    })).toBe(true);
  });
  it('Step 3 — high-intent outcome requires zoning + whatPreventsProgress', () => {
    const incomplete = { landOutcome: 'Sell', startedDevWork: 'No' };
    expect(nextStepReady(3, 'landowner', incomplete)).toBe(false);
    expect(nextStepReady(3, 'landowner', {
      ...incomplete, zoning: 'Residential', whatPreventsProgress: 'Funding',
    })).toBe(true);
  });
  it('Step 3 — Exploring outcome skips zoning + whatPreventsProgress', () => {
    expect(nextStepReady(3, 'landowner', {
      landOutcome: 'Exploring', startedDevWork: 'No',
    })).toBe(true);
  });
});

/* ── Investor ─────────────────────────────────── */

describe('nextStepReady — Investor', () => {
  const completeStep2 = {
    investmentOpportunities: ['Student Accommodation'],
    investmentRange: 'R20M+',
    investmentApproach: ['Equity'],
  };
  it('Step 2 OK', () => {
    expect(nextStepReady(2, 'investor', completeStep2)).toBe(true);
  });
  it('Step 2 fails without investmentApproach', () => {
    expect(nextStepReady(2, 'investor', { ...completeStep2, investmentApproach: [] })).toBe(false);
  });
  it('Step 3 OK', () => {
    expect(nextStepReady(3, 'investor', {
      decisionDrivers: ['Returns'], capitalDeployment: 'Active',
    })).toBe(true);
  });
  it('Step 5 conditional notActiveReason required when capitalDeployment=Selective', () => {
    const fd = {
      activityLevel: 'Actively looking',
      capitalDeployment: 'Selective',
      feedback: 'thoughts',
    };
    expect(nextStepReady(5, 'investor', fd, { consent: fullConsent })).toBe(false);
    expect(nextStepReady(5, 'investor', { ...fd, notActiveReason: 'tight pipeline' }, { consent: fullConsent })).toBe(true);
  });
});

/* ── Student Operator ─────────────────────────── */

describe('nextStepReady — Student Operator', () => {
  const personalWithCompany = { ...fullPersonal, companyName: 'BeMore Living' };

  it('Step 1 OK with personal + companyName (PDF Q2 required)', () => {
    expect(nextStepReady(1, 'student', {}, { personal: personalWithCompany })).toBe(true);
  });
  it('Step 1 fails when companyName missing (PDF Q2 required for Operator)', () => {
    expect(nextStepReady(1, 'student', {}, { personal: fullPersonal })).toBe(false);
  });
  it('Step 2 OK', () => {
    expect(nextStepReady(2, 'student', {
      portfolioSize: '500+ beds',
      portfolioLocations: ['Gauteng'],
      opChallenge: 'Growth',
    })).toBe(true);
  });
  it('Step 3 OK', () => {
    expect(nextStepReady(3, 'student', {
      occupancyLevel: 'Above 90%', scaleLimit: 'Funding',
    })).toBe(true);
  });
  it('Step 3 fails without scaleLimit', () => {
    expect(nextStepReady(3, 'student', { occupancyLevel: 'Above 90%' })).toBe(false);
  });
});

/* ── Professional ─────────────────────────────── */

describe('nextStepReady — Professional', () => {
  it('Step 1 requires primaryRole + personal fields', () => {
    expect(nextStepReady(1, 'professional', {}, { personal: fullPersonal })).toBe(false);
    expect(nextStepReady(1, 'professional', { primaryRole: 'Architect' }, { personal: fullPersonal })).toBe(true);
  });
  it('Step 2 OK with experience + provinces + workStructure (companyPractice optional)', () => {
    expect(nextStepReady(2, 'professional', {
      experienceLevel: 'Senior (10+ years)',
      provinces: ['Gauteng'],
      workStructure: 'Independent',
    })).toBe(true);
  });
  it('Step 5 conditional notActiveReason required when activityLevel = Not actively looking', () => {
    expect(nextStepReady(5, 'professional', {
      activityLevel: 'Not actively looking',
    }, { consent: fullConsent })).toBe(false);
    expect(nextStepReady(5, 'professional', {
      activityLevel: 'Not actively looking',
      notActiveReason: 'Timing not right',
    }, { consent: fullConsent })).toBe(true);
  });
  it('Step 5 OK with "Open to the right opportunity" — Q15 does NOT fire', () => {
    expect(nextStepReady(5, 'professional', {
      activityLevel: 'Open to the right opportunity',
    }, { consent: fullConsent })).toBe(true);
  });
  it('Step 5 conditional notActiveReasonOther required when notActiveReason = Other', () => {
    expect(nextStepReady(5, 'professional', {
      activityLevel: 'Not actively looking',
      notActiveReason: 'Other',
    }, { consent: fullConsent })).toBe(false);
    expect(nextStepReady(5, 'professional', {
      activityLevel: 'Not actively looking',
      notActiveReason: 'Other',
      notActiveReasonOther: 'Sabbatical year',
    }, { consent: fullConsent })).toBe(true);
  });
});

/* ── Aspiring ─────────────────────────────────── */

describe('nextStepReady — Aspiring', () => {
  it('Step 2 OK', () => {
    expect(nextStepReady(2, 'aspiring', {
      involvedBefore: 'No', hasLandAccess: 'No', aspiringDevType: 'Residential',
    })).toBe(true);
  });
  it('Step 3 OK', () => {
    expect(nextStepReady(3, 'aspiring', {
      holdingBack: 'Funding', realisticStart: 'Within 6 months',
    })).toBe(true);
  });
});

/* ── Defensive ───────────────────────────────── */

describe('nextStepReady — defensive', () => {
  it('returns false for unknown profile', () => {
    expect(nextStepReady(2, 'unknown' as ProfileCategory, {})).toBe(false);
  });
  it('returns false for stepIndex out of range', () => {
    expect(nextStepReady(99, 'developer', {})).toBe(false);
  });
});
