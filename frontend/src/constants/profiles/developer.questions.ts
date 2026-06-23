/* ---------------------------------------------------------------
   FLOW 01 — Property Developer
   Spec §5 step mapping + §5.1 conditionals + §7.2 field IDs.
   `activityLevel` stored as the canonical §14 enum, displayed with the
   PDF Section 7 wording (Immediately / Within 3-6 months / Longer term).
   ---------------------------------------------------------------*/

import type { ProfileQuestions, Question, QuestionOption } from '../../types/question.ts';

/**
 * Canonical activityLevel enum (spec §14) with PDF Section 7 display wording.
 * Stored value is one of three canonical strings; users see the PDF labels.
 */
const DEVELOPER_ACTIVITY_OPTIONS: QuestionOption[] = [
  { label: 'Immediately',         value: 'Actively looking' },
  { label: 'Within 3–6 months',   value: 'Open to the right opportunity' },
  { label: 'Longer term',         value: 'Not actively looking' },
];

const step1: Question[] = [
  // PDF Q1 (Full Name / Company Name) is captured by the step file via the
  // `personal.firstName` / `personal.surname` / `personal.companyName` inputs.
  {
    id: 'entityType',
    type: 'radio',
    label: 'Are you developing as an individual or through a company?',
    required: true,
    options: ['Individual', 'Company'],
  },
];

const step2: Question[] = [
  // NEW: Portfolio size field
  {
    id: 'portfolioSize',
    type: 'dropdown',
    label: 'What is your current development portfolio size?',
    required: true,
    options: [
      '0-50 units',
      '51-200 units',
      '201-500 units',
      '501-1000 units',
      '1000+ units'
    ],
  },
  {
    id: 'developmentStage',
    type: 'dropdown',
    label: 'What best describes your current development stage?',
    required: true,
    options: [
      'Concept stage',
      'Feasibility completed',
      'Planning / approvals',
      'Construction-ready',
      'Under construction',
    ],
  },
  {
    id: 'developmentTypes',
    type: 'checkbox',
    label: 'What types of developments are you focused on?',
    required: true,
    options: [
      'Student Accommodation',
      'Residential',
      'Commercial',
      'Mixed-Use',
      'Other',
    ],
  },
  {
    id: 'projectValue',
    type: 'radio',
    label: 'What is the typical project value you are working on?',
    required: true,
    options: ['<R5M', 'R5M–R20M', 'R20M–R100M', 'R100M+'],
  },
];

const step3: Question[] = [
  {
    id: 'fundingPosition',
    type: 'radio',
    label: 'What is your current funding position?',
    required: true,
    options: ['Fully funded', 'Partially funded', 'In discussions', 'No funding secured'],
  },
  {
    id: 'biggestConstraint',
    type: 'dropdown',
    label: 'What is currently the biggest constraint in moving your project forward?',
    required: true,
    options: ['Funding', 'Approvals', 'Structuring', 'Partnering', 'Market uncertainty', 'Other'],
    otherField: { id: 'biggestConstraintOther', label: 'Please specify' },
  },
  {
    id: 'biggestConstraintOther',
    type: 'text',
    label: 'Please specify the constraint',
    required: true,
    showIf: (fd) => fd.biggestConstraint === 'Other',
  },
  {
    id: 'whatMatters',
    type: 'checkbox',
    label: 'When evaluating funding or partners, what matters most?',
    required: true,
    options: ['Speed of funding', 'Cost of capital', 'Strategic partners', 'Track record', 'Flexibility'],
  },
];

const step4: Question[] = [
  // Phone / email written directly to `personal` by the step file.
];

const step5: Question[] = [
  {
    id: 'activityLevel',
    type: 'radio',
    label: 'How actively are you looking to move this project forward?',
    required: true,
    options: DEVELOPER_ACTIVITY_OPTIONS,
  },
  {
    // PDF Q12 — only when not "Immediately" (canonical: != 'Actively looking').
    id: 'notActiveReason',
    type: 'textarea',
    label: 'What is holding you back right now?',
    required: true,
    showIf: (fd) =>
      fd.activityLevel === 'Open to the right opportunity' ||
      fd.activityLevel === 'Not actively looking',
  },
  // No standalone `feedback` field — PDF Developer flow Section 7 only has
  // Q11 (activityLevel) + conditional Q12. Spec §7.2 marks `feedback` as
  // universal Y, but for Developer (and other profiles whose PDF Section 7
  // has only the activity question) we trim it to match the PDF.
];

const developerQuestions: ProfileQuestions = { step1, step2, step3, step4, step5 };

export default developerQuestions;