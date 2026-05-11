/* ---------------------------------------------------------------
   Parity test for the 6 per-profile question configs.
   Source of truth:
     • spec §7.2 — formData field IDs (per-profile + universal).
     • spec §5   — step mapping.
     • spec §5.1 — conditional questions (`showIf` predicates).
     • spec §14  — canonical activityLevel enum.
   This test FAILS the build if any config drifts from the spec.
   ---------------------------------------------------------------*/

import { describe, it, expect } from 'vitest';

import developerQs from '../constants/profiles/developer.questions.ts';
import landownerQs from '../constants/profiles/landowner.questions.ts';
import investorQs from '../constants/profiles/investor.questions.ts';
import studentQs from '../constants/profiles/student.questions.ts';
import professionalQs from '../constants/profiles/professional.questions.ts';
import aspiringQs from '../constants/profiles/aspiring.questions.ts';

import type { ProfileQuestions, Question, QuestionOption } from '../types/question.ts';

/* ── Spec §14 canonical enum ─────────────────────────────────── */

const CANONICAL_ACTIVITY_LEVELS = [
  'Actively looking',
  'Open to the right opportunity',
  'Not actively looking',
] as const;

/** Extract the stored values from a Question's options (string | {label,value}). */
function optionValues(opts: QuestionOption[] | undefined): string[] {
  return (opts ?? []).map(o => typeof o === 'string' ? o : o.value);
}

/* Profiles that retain the universal `feedback` textarea in Step 5.
   Trimmed where the PDF Section 7 has only a conditional question (or none):
   Developer (only Q11/Q12), Investor (only conditional Q10), and Professional
   (PDF Section 6 has only Q14/Q15). */
const PROFILES_WITH_FEEDBACK = new Set(['landowner', 'student', 'aspiring']);

/* Profiles whose PDF has an explicit activityLevel-style question stored as
   `activityLevel`. Developer (Q11), Professional (Q14). Investor's PDF Q7 is
   the activity question but stored as `capitalDeployment` — not included
   here. Land Owner / Operator / Aspiring PDFs have no activity question. */
const PROFILES_WITH_ACTIVITY_LEVEL = new Set(['developer', 'professional']);

/* ── Spec §5 + §7.2: expected per-profile, per-step field IDs ──
   Personal fields (firstName, surname, email, phone, companyName)
   live on `personal` not `formData` — they're handled by the step
   files, not the question configs. So step1 + step4 contain ONLY
   the formData-bound IDs (which is mostly empty + the optional CV
   for Professional Step 4). */

const expected: Record<string, Record<keyof ProfileQuestions, string[]>> = {
  developer: {
    step1: ['entityType'],
    step2: ['developmentStage', 'developmentTypes', 'projectValue'],
    step3: ['fundingPosition', 'biggestConstraint', 'biggestConstraintOther', 'whatMatters'],
    step4: [],
    // PDF Section 7 only has activityLevel + conditional notActiveReason — no
    // standalone feedback for Developer. Spec §7.2 universal `feedback` is
    // trimmed for profiles whose PDF Section 7 doesn't include it.
    step5: ['activityLevel', 'notActiveReason'],
  },
  landowner: {
    step1: [],
    step2: ['landLocation', 'landSize', 'landOutcome'],
    step3: ['zoning', 'startedDevWork', 'whatPreventsProgress'],
    step4: [],
    // PDF Section 7 only has Q10 (the `feedback` textarea). No activityLevel
    // question for Land Owner — trimmed to match PDF.
    step5: ['feedback'],
  },
  investor: {
    step1: ['entityType'],
    step2: ['investmentOpportunities', 'investmentRange', 'investmentApproach'],
    step3: ['decisionDrivers', 'capitalDeployment'],
    step4: [],
    // PDF Section 7 only has the conditional Q10 (`notActiveReason`). The
    // PDF's "activity level" question is `capitalDeployment` in Step 3.
    step5: ['notActiveReason'],
  },
  student: {
    step1: [],
    step2: ['portfolioSize', 'portfolioLocations', 'opChallenge'],
    step3: ['occupancyLevel', 'scaleLimit'],
    step4: [],
    // PDF Section 7 only has Q10 — feedback textarea, no activityLevel.
    step5: ['feedback'],
  },
  professional: {
    step1: ['primaryRole'],
    step2: ['experienceLevel', 'provinces', 'workStructure', 'companyPractice'],
    step3: ['projectTypes', 'avgProjectSize', 'workStyle', 'proWhatMatters'],
    // `cv` is the optional file question — its value flows into the
    // application's `attachments[]`, not formData (spec §7.1). Field id
    // included here because the question itself lives in step4.
    step4: ['cv'],
    // PDF Section 6: Q14 activityLevel + Q15 dropdown (with free-text "Other"
    // branch). No standalone feedback textarea per the PDF.
    step5: ['activityLevel', 'notActiveReason', 'notActiveReasonOther'],
  },
  aspiring: {
    step1: [],
    step2: ['involvedBefore', 'hasLandAccess', 'aspiringDevType'],
    step3: ['holdingBack', 'realisticStart'],
    step4: [],
    // PDF Section 8 only has Q9 — feedback textarea, no activityLevel.
    step5: ['feedback'],
  },
};

const allConfigs: Record<string, ProfileQuestions> = {
  developer: developerQs,
  landowner: landownerQs,
  investor: investorQs,
  student: studentQs,
  professional: professionalQs,
  aspiring: aspiringQs,
};

const STEP_KEYS: (keyof ProfileQuestions)[] = ['step1', 'step2', 'step3', 'step4', 'step5'];

/* ── Helpers ─────────────────────────────────────────────────── */

function ids(qs: Question[]): string[] {
  return qs.map(q => q.id);
}

function findQuestion(profile: ProfileQuestions, id: string): Question | undefined {
  for (const step of STEP_KEYS) {
    const found = profile[step].find(q => q.id === id);
    if (found) return found;
  }
  return undefined;
}

/* ── Suite ───────────────────────────────────────────────────── */

describe('Profile question configs — parity with spec §5 / §7.2', () => {
  describe.each(Object.keys(expected))('Profile: %s', (profile) => {
    const config = allConfigs[profile];
    const exp = expected[profile];

    it('has all 5 step arrays', () => {
      expect(config).toBeDefined();
      for (const step of STEP_KEYS) {
        expect(Array.isArray(config[step])).toBe(true);
      }
    });

    it.each(STEP_KEYS)('exposes the spec-required field IDs in %s', (step) => {
      expect(ids(config[step])).toEqual(exp[step]);
    });

    it('uses the canonical activityLevel enum (spec §14) when activityLevel is present', () => {
      const aLevel = findQuestion(config, 'activityLevel');
      if (PROFILES_WITH_ACTIVITY_LEVEL.has(profile)) {
        expect(aLevel).toBeDefined();
        expect(aLevel!.type).toBe('radio');
        expect(aLevel!.required).toBe(true);
        // Stored VALUES must be the canonical enum; display labels can vary
        // per profile (e.g. Developer uses PDF Section 7 wording).
        expect(optionValues(aLevel!.options)).toEqual([...CANONICAL_ACTIVITY_LEVELS]);
      } else {
        // Profiles whose PDF Section 7 lacks an activity question must NOT
        // include activityLevel at all (Land Owner / Operator / Aspiring).
        expect(aLevel).toBeUndefined();
      }
    });

    it('marks activityLevel/feedback as required only where the PDF requires them', () => {
      const aLevel = findQuestion(config, 'activityLevel');
      const feedback = findQuestion(config, 'feedback');

      if (PROFILES_WITH_ACTIVITY_LEVEL.has(profile)) {
        expect(aLevel?.required).toBe(true);
      } else {
        expect(aLevel).toBeUndefined();
      }

      if (PROFILES_WITH_FEEDBACK.has(profile)) {
        expect(feedback).toBeDefined();
        expect(feedback?.required).toBe(true);
      } else {
        expect(feedback).toBeUndefined();
      }
    });

    it('exposes notActiveReason as a conditional question only where an activity-style question exists', () => {
      const reason = findQuestion(config, 'notActiveReason');
      // Profiles whose PDF Section 7 has either `activityLevel` (Developer,
      // Professional) or `capitalDeployment` (Investor) gate a `notActiveReason`
      // textarea on it. Land Owner / Operator / Aspiring have no such gating.
      const PROFILES_WITH_GATED_REASON = new Set(['developer', 'investor', 'professional']);
      if (PROFILES_WITH_GATED_REASON.has(profile)) {
        expect(reason).toBeDefined();
        expect(typeof reason!.showIf).toBe('function');
      } else {
        expect(reason).toBeUndefined();
      }
    });
  });
});

/* ── Spec §5.1 conditional matrix ────────────────────────────── */

describe('Conditional questions — spec §5.1', () => {
  /* Developer Q12 — fires when activityLevel ≠ 'Actively looking' */
  describe('Developer notActiveReason', () => {
    const q = findQuestion(developerQs, 'notActiveReason')!;

    it('fires for "Open to the right opportunity"', () => {
      expect(q.showIf!({ activityLevel: 'Open to the right opportunity' })).toBe(true);
    });
    it('fires for "Not actively looking"', () => {
      expect(q.showIf!({ activityLevel: 'Not actively looking' })).toBe(true);
    });
    it('does NOT fire for "Actively looking"', () => {
      expect(q.showIf!({ activityLevel: 'Actively looking' })).toBe(false);
    });
  });

  /* Land Owner Q5 + Q7 — fire when landOutcome ∈ {Sell, Develop, Partner, Generate income} */
  describe('Land Owner zoning + whatPreventsProgress softening', () => {
    const zoning = findQuestion(landownerQs, 'zoning')!;
    const prevent = findQuestion(landownerQs, 'whatPreventsProgress')!;

    it.each([
      ['Sell', true],
      ['Develop', true],
      ['Partner', true],
      ['Generate income', true],
      ['Exploring', false],
      ['', false],
      [undefined, false],
    ])('zoning showIf({ landOutcome: %p }) === %p', (val, expected) => {
      expect(zoning.showIf!({ landOutcome: val })).toBe(expected);
    });

    it.each([
      ['Sell', true],
      ['Develop', true],
      ['Partner', true],
      ['Generate income', true],
      ['Exploring', false],
    ])('whatPreventsProgress showIf({ landOutcome: %p }) === %p', (val, expected) => {
      expect(prevent.showIf!({ landOutcome: val })).toBe(expected);
    });
  });

  /* Investor Q10 — fires when capitalDeployment ∈ {Selective, Not currently} */
  describe('Investor notActiveReason', () => {
    const q = findQuestion(investorQs, 'notActiveReason')!;

    it.each([
      ['Active', false],
      ['Selective', true],
      ['Not currently', true],
      [undefined, false],
    ])('showIf({ capitalDeployment: %p }) === %p', (val, expected) => {
      expect(q.showIf!({ capitalDeployment: val })).toBe(expected);
    });
  });

  /* Professional Q15 — PDF says "If NOT actively looking" → fires ONLY when
     activityLevel === 'Not actively looking' (narrower than Developer's
     two-value trigger). */
  describe('Professional notActiveReason (PDF Q15 — strict trigger)', () => {
    const q = findQuestion(professionalQs, 'notActiveReason')!;

    it.each([
      ['Actively looking', false],
      ['Open to the right opportunity', false],
      ['Not actively looking', true],
      [undefined, false],
    ])('showIf({ activityLevel: %p }) === %p', (val, expected) => {
      expect(q.showIf!({ activityLevel: val })).toBe(expected);
    });

    it('is a dropdown with the 5 PDF options', () => {
      expect(q.type).toBe('dropdown');
      expect(q.options).toEqual([
        'Fully committed to current projects',
        'Prefer direct client sourcing',
        'Not aligned with typical opportunities',
        'Timing not right',
        'Other',
      ]);
    });
  });

  /* Professional Q15 "Other" branch — free-text input shown only when Q15
     resolves to 'Other'. Implements the PDF "Other (text)" affordance. */
  describe('Professional notActiveReasonOther (PDF Q15 "Other" branch)', () => {
    const q = findQuestion(professionalQs, 'notActiveReasonOther')!;

    it('exists as a required text input', () => {
      expect(q).toBeDefined();
      expect(q.type).toBe('text');
      expect(q.required).toBe(true);
    });

    it.each([
      [{ activityLevel: 'Not actively looking', notActiveReason: 'Other' }, true],
      [{ activityLevel: 'Not actively looking', notActiveReason: 'Timing not right' }, false],
      [{ activityLevel: 'Actively looking', notActiveReason: 'Other' }, false],
      [{}, false],
    ])('showIf(%o) === %p', (fd, expected) => {
      expect(q.showIf!(fd)).toBe(expected);
    });
  });
});

/* ── Professional CV upload (spec §5 + §7.1) ─────────────────── */

describe('Professional CV upload (Step 4)', () => {
  const cv = findQuestion(professionalQs, 'cv')!;

  it('is an optional file input', () => {
    expect(cv).toBeDefined();
    expect(cv.type).toBe('file');
    expect(cv.required).toBe(false);
  });

  it('accepts PDF, DOC, and DOCX MIME types', () => {
    const accept = cv.accept ?? '';
    expect(accept).toContain('application/pdf');
    expect(accept).toContain('application/msword');
    expect(accept).toContain(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  });

  it('caps file size at exactly 5 MB', () => {
    expect(cv.maxSizeBytes).toBe(5 * 1024 * 1024);
  });
});

/* ── activityLevel canonical enum used everywhere ─────────────── */

describe('activityLevel canonical enum (spec §14)', () => {
  it('profiles that have activityLevel store one of the three canonical values', () => {
    for (const profile of PROFILES_WITH_ACTIVITY_LEVEL) {
      const q = findQuestion(allConfigs[profile], 'activityLevel');
      // Stored values are canonical; display labels may differ per profile.
      expect(optionValues(q?.options)).toEqual([...CANONICAL_ACTIVITY_LEVELS]);
    }
  });

  it('profiles without an activityLevel question per the PDF do not include it', () => {
    const profilesWithout = ['landowner', 'investor', 'student', 'aspiring'];
    for (const profile of profilesWithout) {
      const q = findQuestion(allConfigs[profile], 'activityLevel');
      expect(q).toBeUndefined();
    }
  });
});
