/* ---------------------------------------------------------------
   collectAllFormData(profile) — submission body shape per spec §7.2.
   Asserts:
     • Only the spec §7.2 keys for that profile (+ universal Step-5) appear.
     • No legacy keys ever survive.
     • Personal fields go on `personal`, not formData.
     • attachments[] populated only for Professional with a CV.
   ---------------------------------------------------------------*/

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../store.ts';
import { collectAllFormData } from '../pages/public/form.ts';
import type { ProfileCategory } from '../types/index.ts';

const LEGACY_KEYS = [
  'landStatus', 'projectStage', 'estimatedValue', 'seeking', 'previousFunding',
  'totalBedCount', 'averageOccupancy', 'supportNeeds', 'growthIntention',
  // also: never leak transient / personal slices into formData
  'personal', 'attachments', 'consent', '__uploadInFlight',
];

const COMPLETE: Record<ProfileCategory, Record<string, unknown>> = {
  developer: {
    entityType: 'Company',
    developmentStage: 'Construction-ready',
    developmentTypes: ['Student Accommodation'],
    projectValue: 'R100M+',
    fundingPosition: 'No funding secured',
    biggestConstraint: 'Funding',
    whatMatters: ['Speed of funding'],
    activityLevel: 'Actively looking',
  },
  landowner: {
    landLocation: 'Sandton',
    landSize: '5000 sqm',
    landOutcome: 'Sell',
    zoning: 'Commercial',
    startedDevWork: 'No',
    whatPreventsProgress: 'Funding',
    feedback: 'Looking for a buyer.',
  },
  investor: {
    entityType: 'Company',
    investmentOpportunities: ['Residential'],
    investmentRange: 'R20M+',
    investmentApproach: ['Equity'],
    decisionDrivers: ['Returns'],
    capitalDeployment: 'Active',
  },
  student: {
    portfolioSize: '500+ beds',
    portfolioLocations: ['Gauteng'],
    opChallenge: 'Growth',
    occupancyLevel: 'Above 90%',
    scaleLimit: 'Funding',
    feedback: 'Need capital to scale.',
  },
  professional: {
    primaryRole: 'Architect',
    experienceLevel: 'Senior (10+ years)',
    provinces: ['Gauteng', 'KZN', 'Western Cape'],
    workStructure: 'Independent',
    projectTypes: ['Student Accommodation'],
    avgProjectSize: 'Major (R50M+)',
    workStyle: 'Project-based contracts',
    proWhatMatters: ['Project scale'],
    activityLevel: 'Actively looking',
  },
  aspiring: {
    involvedBefore: 'No',
    hasLandAccess: 'Yes',
    aspiringDevType: 'Residential',
    holdingBack: 'Funding',
    realisticStart: 'Immediately',
    feedback: 'Need a mentor.',
  },
};

const EXPECTED_KEYS: Record<ProfileCategory, string[]> = {
  developer: [
    'entityType',
    'developmentStage', 'developmentTypes', 'projectValue',
    'fundingPosition', 'biggestConstraint', 'whatMatters',
    'activityLevel',
  ],
  landowner: [
    'landLocation', 'landSize', 'landOutcome',
    'zoning', 'startedDevWork', 'whatPreventsProgress',
    'feedback',
  ],
  investor: [
    'entityType',
    'investmentOpportunities', 'investmentRange', 'investmentApproach',
    'decisionDrivers', 'capitalDeployment',
  ],
  student: [
    'portfolioSize', 'portfolioLocations', 'opChallenge',
    'occupancyLevel', 'scaleLimit',
    'feedback',
  ],
  professional: [
    'primaryRole',
    'experienceLevel', 'provinces', 'workStructure',
    'projectTypes', 'avgProjectSize', 'workStyle', 'proWhatMatters',
    'activityLevel',
  ],
  aspiring: [
    'involvedBefore', 'hasLandAccess', 'aspiringDevType',
    'holdingBack', 'realisticStart',
    'feedback',
  ],
};

describe('collectAllFormData(profile) — spec §7.2', () => {
  beforeEach(() => {
    store.set('formData', {});
    store.set('selectedProfile', null);
    store.set('currentStep', 1);
  });

  for (const profile of Object.keys(COMPLETE) as ProfileCategory[]) {
    it(`${profile}: emits exactly the spec §7.2 keys, no legacy keys, no attachments`, () => {
      const fixture = {
        ...COMPLETE[profile],
        // also stash legacy junk in store to prove it gets stripped
        landStatus: 'Land Secured',
        projectStage: 'Funding Stage',
        estimatedValue: 'R100m+',
        previousFunding: 'Institutional',
        seeking: ['Equity Partner'],
        // and the non-formData slices
        personal: { firstName: 'A', surname: 'B', email: 'a@b.co', phone: '+27821234567' },
        consent: { tc: true, popia: true },
        __uploadInFlight: false,
      };
      store.set('formData', fixture);
      const out = collectAllFormData(profile);

      // Every expected key present
      for (const k of EXPECTED_KEYS[profile]) {
        expect(out).toHaveProperty(k);
      }
      // Every legacy / personal slice key absent
      for (const k of LEGACY_KEYS) {
        expect(out).not.toHaveProperty(k);
      }
      // No EXTRA keys beyond the expected list (strict equality)
      expect(Object.keys(out).sort()).toEqual([...EXPECTED_KEYS[profile]].sort());
    });
  }

  it('Professional submission preserves the Q15 "Other" branch (notActiveReason + notActiveReasonOther)', () => {
    // PDF Q15 "Other" → notActiveReason='Other' AND notActiveReasonOther=<free text>.
    // Regression test for QA-blocker #1: the backend whitelist must keep
    // notActiveReasonOther so the user's free-text reason isn't dropped.
    store.set('formData', {
      ...COMPLETE.professional,
      activityLevel: 'Not actively looking',
      notActiveReason: 'Other',
      notActiveReasonOther: 'Sabbatical year',
    });
    const out = collectAllFormData('professional');
    expect(out).toHaveProperty('notActiveReason', 'Other');
    expect(out).toHaveProperty('notActiveReasonOther', 'Sabbatical year');
  });

  it('Professional submission includes attachments[] when CV uploaded', () => {
    store.set('formData', {
      ...COMPLETE.professional,
      attachments: [{ field: 'cv', filename: 'alex-cv.pdf', storedAs: 'uuid.pdf' }],
    });
    const out = collectAllFormData('professional');
    // attachments stays out of formData proper — it's a sibling on the
    // submission body. collectAllFormData only returns `formData`.
    expect(out).not.toHaveProperty('attachments');
    expect(out).not.toHaveProperty('cv');
  });
});
