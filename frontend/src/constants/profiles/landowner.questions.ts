/* ---------------------------------------------------------------
   FLOW 02 — Land Owner
   Spec §5 + §5.1 (Step 3 zoning + preventing-progress conditional on
   landOutcome ∈ {'Sell','Develop','Partner','Generate income'})
   §7.2 field IDs. §14 canonical activityLevel enum.
   ---------------------------------------------------------------*/

import type { ProfileQuestions, Question } from '../../types/question.ts';

const HIGH_INTENT_OUTCOMES = new Set(['Sell', 'Develop', 'Partner', 'Generate income']);

const step1: Question[] = [
  // Identity (firstName / surname) handled by the step file → `personal`.
];

const step2: Question[] = [
  {
    id: 'landLocation',
    type: 'text',
    label: 'Where is the land located?',
    required: true,
    placeholder: 'e.g. Sandton, Gauteng',
  },
  {
    id: 'landSize',
    type: 'text',
    label: 'What is the size of the land?',
    required: true,
    placeholder: 'e.g. 5,000 sqm',
  },
  {
    id: 'landOutcome',
    type: 'radio',
    label: 'What outcome are you looking to achieve?',
    required: true,
    options: ['Sell', 'Develop', 'Partner', 'Generate income', 'Exploring'],
  },
];

const step3: Question[] = [
  {
    // Spec §5.1 — softened for browsers (Exploring) per design note.
    id: 'zoning',
    type: 'text',
    label: 'What is the current zoning status?',
    required: true,
    placeholder: 'e.g. Residential, Mixed-Use, Awaiting rezoning',
    showIf: (fd) => HIGH_INTENT_OUTCOMES.has(String(fd.landOutcome ?? '')),
  },
  {
    id: 'startedDevWork',
    type: 'radio',
    label: 'Have you started any development-related work?',
    required: true,
    options: ['Yes', 'No'],
  },
  {
    // Spec §5.1 — softened conditional.
    id: 'whatPreventsProgress',
    type: 'dropdown',
    label: 'What is currently preventing progress on the land?',
    required: true,
    options: ['Funding', 'Knowledge', 'Approvals', 'Finding partners', 'Not sure'],
    showIf: (fd) => HIGH_INTENT_OUTCOMES.has(String(fd.landOutcome ?? '')),
  },
];

const step4: Question[] = [
  // Phone / email handled by the step file → `personal`.
];

const step5: Question[] = [
  // PDF Section 7 only has Q10. No activityLevel question for Land Owner.
  {
    id: 'feedback',
    type: 'textarea',
    label: 'What would make you comfortable moving forward?',
    required: true,
    placeholder: 'Share what assurances, support, or partnerships would help.',
  },
];

const landownerQuestions: ProfileQuestions = { step1, step2, step3, step4, step5 };

export default landownerQuestions;
