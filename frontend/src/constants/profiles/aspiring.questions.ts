/* ---------------------------------------------------------------
   FLOW 06 — Aspiring Developer
   Spec §5 + §7.2 field IDs. §14 canonical activityLevel enum.
   No spec §5.1 conditional for this profile.
   ---------------------------------------------------------------*/

import type { ProfileQuestions, Question } from '../../types/question.ts';

const step1: Question[] = [
  // Identity (firstName / surname) → `personal` via step file.
];

const step2: Question[] = [
  {
    id: 'involvedBefore',
    type: 'radio',
    label: 'Have you been involved in a development before?',
    required: true,
    options: ['Yes', 'No'],
  },
  {
    id: 'hasLandAccess',
    type: 'radio',
    label: 'Do you currently have access to land?',
    required: true,
    options: ['Yes', 'No'],
  },
  {
    id: 'aspiringDevType',
    type: 'dropdown',
    label: 'What type of development are you interested in?',
    required: true,
    options: [
      'Student Accommodation',
      'Residential',
      'Commercial',
      'Mixed-Use',
      'Other',
    ],
  },
];

const step3: Question[] = [
  {
    id: 'holdingBack',
    type: 'dropdown',
    label: 'What is currently holding you back?',
    required: true,
    options: ['Funding', 'Knowledge', 'Experience', 'Network'],
  },
  {
    id: 'realisticStart',
    type: 'dropdown',
    label: 'When would you realistically want to start?',
    required: true,
    options: ['Immediately', 'Within 6 months', 'Within 12 months', 'Longer than a year'],
  },
];

const step4: Question[] = [
  // Phone / email → `personal` via step file.
];

const step5: Question[] = [
  // PDF Section 8 only has Q9. No activityLevel question for Aspiring.
  {
    id: 'feedback',
    type: 'textarea',
    label: 'What kind of support would help you take the next step?',
    required: true,
    placeholder: 'Mentorship, funding, training, partnerships, etc.',
  },
];

const aspiringQuestions: ProfileQuestions = { step1, step2, step3, step4, step5 };

export default aspiringQuestions;
