/* ---------------------------------------------------------------
   FLOW 03 — Investor
   Spec §5 + §5.1 (Q10 What's limiting shows when capitalDeployment ∈
   {'Selective', 'Not currently'}).
   §7.2 field IDs. PDF Section 5 ACTIVITY LEVEL is `capitalDeployment`
   (stored 'Active' / 'Selective' / 'Not currently' per PDF wording);
   we do NOT also render the universal `activityLevel` — that would be
   redundant for Investor. PDF Section 7 has only the conditional Q10.
   ---------------------------------------------------------------*/

import type { ProfileQuestions, Question } from '../../types/question.ts';

const step1: Question[] = [
  // Q1 (Name / Entity) is captured via the step file: `personal.firstName` +
  // `personal.surname` + optional `personal.companyName`.
  {
    id: 'entityType',
    type: 'radio',
    label: 'Are you investing as an individual or through a company?',
    required: true,
    options: ['Individual', 'Company'],
  },
];

const step2: Question[] = [
  {
    id: 'investmentOpportunities',
    type: 'checkbox',
    label: 'What types of opportunities are you interested in?',
    required: true,
    options: [
      'Student Accommodation',
      'Residential',
      'Commercial',
      'Mixed-Use',
      'Land',
      'Infrastructure',
    ],
  },
  {
    id: 'investmentRange',
    type: 'radio',
    label: 'Preferred investment range',
    required: true,
    options: ['<R1M', 'R1M–R5M', 'R5M–R10M', 'R10M–R20M', 'R20M+'],
  },
  {
    id: 'investmentApproach',
    type: 'checkbox',
    label: 'How do you typically invest?',
    required: true,
    options: ['Equity', 'Debt', 'JV', 'Acquisition'],
  },
];

const step3: Question[] = [
  {
    id: 'decisionDrivers',
    type: 'checkbox',
    label: 'What factors drive your investment decisions?',
    required: true,
    options: ['Returns', 'Risk', 'Location', 'Operator strength'],
  },
  {
    id: 'capitalDeployment',
    type: 'radio',
    label: 'How actively are you deploying capital?',
    required: true,
    options: ['Active', 'Selective', 'Not currently'],
  },
];

const step4: Question[] = [
  // Phone / email → `personal` via step file.
];

const step5: Question[] = [
  {
    // Spec §5.1 — Investor Q10 fires on capitalDeployment ∈ {'Selective','Not currently'}.
    id: 'notActiveReason',
    type: 'textarea',
    label: 'What is limiting your investment activity right now?',
    required: true,
    showIf: (fd) =>
      fd.capitalDeployment === 'Selective' || fd.capitalDeployment === 'Not currently',
  },
  // No standalone `feedback` field for Investor — PDF Section 7 only has Q10.
];

const investorQuestions: ProfileQuestions = { step1, step2, step3, step4, step5 };

export default investorQuestions;
