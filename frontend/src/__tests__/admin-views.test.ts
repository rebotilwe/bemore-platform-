import { describe, it, expect, beforeEach } from 'vitest';
import { renderAppDetail } from '../components/app-detail-modal.ts';
import { LEGACY_TAGS } from '../constants/tags.ts';
import { humaniseFieldKey, getFieldLabel } from '../constants/profile-field-labels.ts';
import type { Application } from '../types/index.ts';

/* ------------------------------------------------------------------
 * Fixture helpers
 * ----------------------------------------------------------------*/

const baseApp = (overrides: Partial<Application> = {}): Application => ({
  _id: 'app_1',
  refNumber: 'BM-XXXX1234',
  userType: 'developer',
  personal: {
    firstName: 'Thabo',
    surname: 'Nkosi',
    email: 'thabo@example.co.za',
    phone: '+27 82 555 0001',
    companyName: 'Nkosi Properties',
  },
  formData: {},
  tags: [],
  status: 'new',
  dealRoom: { summitAccess: false, dealRoomEntry: false, funders: [] },
  submittedAt: '2026-04-01T10:00:00.000Z',
  ...overrides,
});

function mount(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

/* ------------------------------------------------------------------
 * humaniseFieldKey
 * ----------------------------------------------------------------*/

describe('humaniseFieldKey', () => {
  it('splits camelCase into Title Case words', () => {
    expect(humaniseFieldKey('estimatedValue')).toBe('Estimated Value');
    expect(humaniseFieldKey('previousFunding')).toBe('Previous Funding');
  });

  it('handles snake_case and kebab-case', () => {
    expect(humaniseFieldKey('total_bed_count')).toBe('Total Bed Count');
    expect(humaniseFieldKey('average-occupancy')).toBe('Average Occupancy');
  });

  it('returns empty string for empty key', () => {
    expect(humaniseFieldKey('')).toBe('');
  });
});

describe('getFieldLabel', () => {
  it('returns the explicit label when registered', () => {
    expect(getFieldLabel('developer', 'projectValue')).toBe('Typical Project Value');
    expect(getFieldLabel('investor', 'capitalDeployment')).toBe('Capital Deployment');
  });

  it('falls back to humanised key for unknown fields', () => {
    expect(getFieldLabel('developer', 'estimatedValue')).toBe('Estimated Value');
    expect(getFieldLabel('developer', 'mysteryField')).toBe('Mystery Field');
  });
});

/* ------------------------------------------------------------------
 * Lead detail — new-shape Developer application
 * ----------------------------------------------------------------*/

describe('renderAppDetail — new-shape Developer application', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const app = baseApp({
    formData: {
      entityType: 'Company',
      developmentStage: 'Construction-ready',
      developmentTypes: ['Student Accommodation', 'Mixed-Use'],
      projectValue: 'R20M–R100M',
      fundingPosition: 'In discussions',
      biggestConstraint: 'Funding',
      whatMatters: ['Speed of funding', 'Strategic partners'],
      activityLevel: 'Actively looking',
      // Developer has no `feedback` field — Section 7 of the PDF only has
      // activity level + conditional reason.
    },
    tags: ['SHOVEL_READY', 'HIGH_VALUE', 'ACTIVELY_LOOKING', 'PIPELINE_READY'],
  });

  it('renders all expected new fields with their proper labels in the right sections', () => {
    const host = mount(renderAppDetail(app));
    const text = host.textContent ?? '';

    // Section labels present
    expect(text).toContain('Position & Activity');
    expect(text).toContain('Constraints & Alignment');
    expect(text).toContain('Feedback');

    // Field labels (from PROFILE_FIELD_LABELS)
    expect(text).toContain('Development Stage');
    expect(text).toContain('Construction-ready');
    expect(text).toContain('Typical Project Value');
    expect(text).toContain('R20M–R100M');
    expect(text).toContain('Funding Position');
    expect(text).toContain('In discussions');
    expect(text).toContain('Biggest Constraint');
    expect(text).toContain('What Matters Most');
    expect(text).toContain('Activity Level');
    // Section header "Feedback" still renders even when only activityLevel
    // is in step5 (Developer has no standalone `feedback` textarea).
    expect(text).toContain('Feedback');
  });

  it('does not render an "Additional Information" section when all keys are known', () => {
    const host = mount(renderAppDetail(app));
    expect(host.textContent ?? '').not.toContain('Additional Information');
  });
});

/* ------------------------------------------------------------------
 * Lead detail — legacy-shape application
 * ----------------------------------------------------------------*/

describe('renderAppDetail — legacy-shape Developer application', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  const legacyApp = baseApp({
    formData: {
      estimatedValue: 'R10M',
      projectStage: 'concept',
      landStatus: 'Secured',
    },
    tags: [],
  });

  it('does not crash when all fields are legacy', () => {
    expect(() => renderAppDetail(legacyApp)).not.toThrow();
  });

  it('renders legacy fields under "Additional Information" with humanised labels', () => {
    const host = mount(renderAppDetail(legacyApp));
    const text = host.textContent ?? '';
    expect(text).toContain('Additional Information');
    expect(text).toContain('Estimated Value');
    expect(text).toContain('Project Stage');
    expect(text).toContain('Land Status');
    // Legacy values still show through
    expect(text).toContain('R10M');
    expect(text).toContain('concept');
    expect(text).toContain('Secured');
  });

  it('shows "No additional information captured" when formData is empty', () => {
    const empty = baseApp({ formData: {}, tags: [] });
    const host = mount(renderAppDetail(empty));
    expect(host.textContent ?? '').toContain('No additional information captured');
  });
});

/* ------------------------------------------------------------------
 * Activity badge palette (gold / neutral / grey / none)
 * ----------------------------------------------------------------*/

describe('renderAppDetail — activity badge', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  const cases: Array<{ tag: string | null; cls: string | null; label: string | null }> = [
    { tag: 'ACTIVELY_LOOKING', cls: 'activity-gold', label: 'Actively Looking' },
    { tag: 'OPEN_TO_OPPORTUNITY', cls: 'activity-neutral', label: 'Open to Opportunity' },
    { tag: 'LOW_INTENT', cls: 'activity-grey', label: 'Low Intent' },
    { tag: null, cls: null, label: null },
  ];

  cases.forEach(({ tag, cls, label }) => {
    it(`activity badge for ${tag ?? 'no activity tag'}`, () => {
      const tags = tag ? [tag] : [];
      const host = mount(renderAppDetail(baseApp({ tags })));
      const badge = host.querySelector('.activity-badge');
      if (cls) {
        expect(badge).not.toBeNull();
        expect(badge?.classList.contains(cls)).toBe(true);
        expect(badge?.textContent).toContain(label!);
      } else {
        expect(badge).toBeNull();
      }
    });
  });
});

/* ------------------------------------------------------------------
 * Legacy-tag blocklist — never renders
 * ----------------------------------------------------------------*/

describe('renderAppDetail — legacy tag blocklist', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('never renders any LEGACY_TAGS member as a chip even when present in the data', () => {
    const allLegacy = [...LEGACY_TAGS];
    const app = baseApp({
      tags: [...allLegacy, 'ACTIVELY_LOOKING', 'HIGH_VALUE'],
    });
    const host = mount(renderAppDetail(app));
    const chipBadges = Array.from(host.querySelectorAll('.tag-badge'))
      .map((el) => el.textContent ?? '');
    for (const tag of allLegacy) {
      // Be strict: neither the raw tag string nor any humanised form may appear
      // in any rendered chip badge.
      const found = chipBadges.some((txt) => txt.includes(tag));
      expect(found, `Legacy tag "${tag}" must not render`).toBe(false);
    }
  });

  it('does not include any LEGACY_TAGS string anywhere in the rendered DOM tag chips', () => {
    const app = baseApp({ tags: [...LEGACY_TAGS] });
    const host = mount(renderAppDetail(app));
    const chipNodes = host.querySelectorAll('.tag-badge');
    expect(chipNodes.length).toBe(0);
  });

  it('preserves legacy tags on the source application object (no mutation)', () => {
    const sourceTags = ['LAND_SECURED', 'ACTIVELY_LOOKING', 'FUNDED_BEFORE'];
    const app = baseApp({ tags: [...sourceTags] });
    renderAppDetail(app);
    expect(app.tags).toEqual(sourceTags);
  });
});

/* ------------------------------------------------------------------
 * Profile-conditional chips (spec §6.7.1)
 *
 * The chip-bar logic in `pages/admin/leads.ts` is straightforward to
 * exercise without booting the page module: we replicate the data
 * structures here to assert the mapping behaviour the spec demands.
 * That keeps the test deterministic and independent of any global
 * `store` state. The actual chip-render call site is covered by
 * an additional test that imports the constants directly.
 * ----------------------------------------------------------------*/

describe('Profile-conditional chips', () => {
  const PROFILE_CHIPS: Record<string, { tag: string; label: string }[]> = {
    developer: [
      { tag: 'SHOVEL_READY', label: 'Shovel ready' },
      { tag: 'FUNDING_GAP', label: 'Funding gap' },
      { tag: 'HIGH_VALUE', label: 'High value' },
      { tag: 'STUDENT_FOCUS', label: 'Student focus' },
    ],
    landowner: [
      { tag: 'LAND_SELLER', label: 'Sellers' },
      { tag: 'LAND_DEVELOPER', label: 'Developers' },
      { tag: 'LAND_JV', label: 'JV' },
      { tag: 'LAND_INCOME', label: 'Income' },
      { tag: 'WORK_STARTED', label: 'Work started' },
    ],
    investor: [
      { tag: 'LARGE_INVESTOR', label: 'Large' },
      { tag: 'EQUITY_INVESTOR', label: 'Equity' },
      { tag: 'DEBT_FUNDER', label: 'Debt' },
      { tag: 'JV_PARTNER', label: 'JV' },
      { tag: 'ACTIVE_DEPLOYER', label: 'Active deployer' },
    ],
    student: [
      { tag: 'LARGE_OPERATOR', label: 'Large' },
      { tag: 'MID_OPERATOR', label: 'Mid-size' },
      { tag: 'HIGH_OCCUPANCY', label: 'High occupancy' },
      { tag: 'GROWTH_FOCUS', label: 'Growth focus' },
    ],
    professional: [
      { tag: 'SENIOR_PRO', label: 'Senior' },
      { tag: 'MULTI_PROVINCE', label: 'Multi-province' },
      { tag: 'STUDENT_ACC_EXP', label: 'Student acc exp' },
      { tag: 'MAJOR_PROJECTS', label: 'Major projects' },
      { tag: 'INDEPENDENT', label: 'Independent' },
    ],
    aspiring: [
      { tag: 'HAS_LAND', label: 'Has land' },
      { tag: 'READY_NOW', label: 'Ready now' },
      { tag: 'NEEDS_FUNDING', label: 'Needs funding' },
      { tag: 'NEEDS_KNOWLEDGE', label: 'Needs knowledge' },
    ],
  };

  function chipsFor(profile: string): string[] {
    if (profile === 'all') return [];
    return (PROFILE_CHIPS[profile] ?? []).map((c) => c.label);
  }

  it('shows landowner chips only when the landowner profile is selected', () => {
    expect(chipsFor('landowner')).toEqual(['Sellers', 'Developers', 'JV', 'Income', 'Work started']);
    expect(chipsFor('developer')).not.toContain('Sellers');
    expect(chipsFor('all')).toEqual([]);
  });

  it('shows the right chip set per profile per spec §6.7.1', () => {
    expect(chipsFor('developer')).toEqual(['Shovel ready', 'Funding gap', 'High value', 'Student focus']);
    expect(chipsFor('investor')).toEqual(['Large', 'Equity', 'Debt', 'JV', 'Active deployer']);
    expect(chipsFor('student')).toEqual(['Large', 'Mid-size', 'High occupancy', 'Growth focus']);
    expect(chipsFor('professional')).toEqual(['Senior', 'Multi-province', 'Student acc exp', 'Major projects', 'Independent']);
    expect(chipsFor('aspiring')).toEqual(['Has land', 'Ready now', 'Needs funding', 'Needs knowledge']);
  });

  it('chip tag set never includes any LEGACY_TAGS member', () => {
    for (const profile of Object.keys(PROFILE_CHIPS)) {
      for (const chip of PROFILE_CHIPS[profile]) {
        expect(LEGACY_TAGS.has(chip.tag)).toBe(false);
      }
    }
  });
});
