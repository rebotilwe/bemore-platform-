/* ---------------------------------------------------------------
   FLOW 04 — Student Accommodation Operator
   Spec §5 + §7.2 field IDs. §14 canonical activityLevel enum.
   No spec §5.1 conditional for this profile (Step 5 is unconditional).
   ---------------------------------------------------------------*/

import type { ProfileQuestions, Question } from '../../types/question.ts';

const SA_PROVINCES = [
  'Gauteng',
  'KwaZulu-Natal',
  'Western Cape',
  'Eastern Cape',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Free State',
  'Northern Cape',
];

const step1: Question[] = [
  // Identity (firstName / surname / companyName) → `personal` via step file.
];

const step2: Question[] = [
  {
    id: 'portfolioSize',
    type: 'dropdown',
    label: 'Portfolio size (beds)',
    required: true,
    options: ['Under 50 beds', '51–200 beds', '201–500 beds', '500+ beds'],
  },
  // NEW: Accreditation field
  {
    id: 'accreditation',
    type: 'dropdown',
    label: 'Do you have any formal accreditation?',
    required: false,
    options: [
      'None',
      'Department of Higher Education (DHET)',
      'Private Accreditation Body',
      'University Partnership',
      'Other'
    ],
    otherField: { id: 'accreditationOther', label: 'Please specify' },
  },
  {
    id: 'portfolioLocations',
    type: 'checkbox',
    label: 'In which provinces do you operate?',
    required: true,
    options: SA_PROVINCES,
  },
  {
    id: 'opChallenge',
    type: 'dropdown',
    label: 'What is your biggest operational challenge?',
    required: true,
    options: ['Occupancy', 'Maintenance', 'Compliance', 'Admin', 'Growth'],
  },
];

const step3: Question[] = [
  {
    // Auto-tag rule §9.2 `HIGH_OCCUPANCY` matches both 'Above 90%' AND legacy
    // 'High' values, so dropping the redundant 'High' option here is safe for
    // existing data.
    id: 'occupancyLevel',
    type: 'radio',
    label: 'How would you describe your current occupancy levels?',
    required: true,
    options: ['Below 70%', '70%–90%', 'Above 90%'],
  },
  {
    id: 'scaleLimit',
    type: 'dropdown',
    label: 'What is limiting your ability to scale?',
    required: true,
    options: ['Funding', 'Land', 'Operations', 'Compliance', 'Talent', 'Demand'],
  },
];

const step4: Question[] = [
  // Phone / email → `personal` via step file.
];

const step5: Question[] = [
  // PDF Section 7 only has Q10. No activityLevel question for Operator.
  {
    id: 'feedback',
    type: 'textarea',
    label: 'What kind of support would make the biggest difference?',
    required: true,
    placeholder: 'Funding, partnerships, accreditation help, operations, etc.',
  },
];

const studentQuestions: ProfileQuestions = { step1, step2, step3, step4, step5 };

export default studentQuestions;