/* ---------------------------------------------------------------
   FLOW 05 — Built Environment Professional
   Spec §5 + §5.1 (Q15 Why not actively looking shows when
   activityLookingNow ∈ {'Open to the right opportunity', 'Not actively looking'}).
   §7.2 field IDs. §14 canonical activityLevel enum.
   Step 4 includes the optional CV upload (5 MB, PDF/DOC/DOCX) —
   the `cv` question id maps to the application's `attachments[]`
   sub-document, not formData (see spec §7.1).
   ---------------------------------------------------------------*/

import type { ProfileQuestions, Question } from '../../types/question.ts';

const ACTIVITY_LEVEL_OPTIONS = [
  'Actively looking',
  'Open to the right opportunity',
  'Not actively looking',
];

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

const CV_ACCEPTED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',');

const step1: Question[] = [
  {
    id: 'primaryRole',
    type: 'dropdown',
    label: 'Which best describes your primary role in the built environment?',
    required: true,
    options: [
      'Architect',
      'Civil Engineer',
      'Structural Engineer',
      'Electrical Engineer',
      'Mechanical Engineer',
      'Quantity Surveyor',
      'Project Manager',
      'Town Planner',
      'Land Surveyor',
      'Environmental Consultant',
      'Contractor',
      'Other',
    ],
  },
];

const step2: Question[] = [
  {
    id: 'experienceLevel',
    type: 'dropdown',
    label: 'How would you describe your current level of experience?',
    required: true,
    options: [
      'Early career (0–2 years)',
      'Developing (3–5 years)',
      'Established (6–10 years)',
      'Senior (10+ years)',
    ],
  },
  {
    id: 'provinces',
    type: 'checkbox',
    label: 'Which provinces do you actively deliver work in?',
    required: true,
    options: SA_PROVINCES,
  },
  {
    id: 'workStructure',
    type: 'radio',
    label: 'Are you currently operating independently or within a firm?',
    required: true,
    options: ['Independent', 'Part of a firm', 'Both'],
  },
  {
    id: 'companyPractice',
    type: 'text',
    label: 'If applicable, what is your company or practice name?',
    required: false,
    placeholder: 'e.g. Mokoena & Associates',
  },
];

const step3: Question[] = [
  {
    id: 'projectTypes',
    type: 'checkbox',
    label: 'Which project types have you been meaningfully involved in?',
    required: true,
    options: [
      'Residential',
      'Student Accommodation',
      'Commercial',
      'Retail',
      'Industrial',
      'Mixed-Use',
      'Infrastructure',
      'Other',
    ],
  },
  {
    id: 'avgProjectSize',
    type: 'radio',
    label: 'On average, what size projects do you typically work on?',
    required: true,
    options: [
      'Entry-scale (<R1M)',
      'Small (R1M–R5M)',
      'Mid-scale (R5M–R20M)',
      'Large (R20M–R50M)',
      'Major (R50M+)',
    ],
  },
  {
    id: 'workStyle',
    type: 'radio',
    label: 'How do you typically take on new work?',
    required: true,
    options: ['Long-term retained work', 'Project-based contracts', 'Mix of both'],
  },
  {
    id: 'proWhatMatters',
    type: 'checkbox',
    label: 'When reviewing new opportunities, what matters most to you?',
    required: true,
    options: [
      'Project scale',
      'Location',
      'Type of development',
      'Stability of funding',
      'Team quality',
      'Fees',
      'Other',
    ],
  },
];

const step4: Question[] = [
  // Phone / email → `personal` via step file.
  {
    // Optional CV / company profile upload — spec §5 (Step 4 Q13) + §7.1.
    // The id `cv` keys into the application's `attachments[]` payload, not
    // formData. The step file owns the actual upload network call (POST
    // /api/applications/upload) and replaces this value with the returned
    // metadata before submission.
    id: 'cv',
    type: 'file',
    label: 'Upload CV or company profile',
    required: false,
    accept: CV_ACCEPTED_MIME,
    maxSizeBytes: 5 * 1024 * 1024,
    helpText: 'PDF, DOC, or DOCX up to 5 MB. Optional but speeds up shortlist review.',
  },
];

const step5: Question[] = [
  {
    // PDF Q14 — universal canonical `activityLevel` (spec §14).
    id: 'activityLevel',
    type: 'radio',
    label: 'How actively are you looking for new project opportunities right now?',
    required: true,
    options: ACTIVITY_LEVEL_OPTIONS,
  },
  {
    // PDF Q15 — dropdown of 5 fixed reasons + free-text "Other" branch.
    // Trigger: PDF says "If NOT actively looking" → narrow to that single
    // option (Developer flow's broader two-value trigger does NOT apply here).
    id: 'notActiveReason',
    type: 'dropdown',
    label: 'What is the main reason you are not actively looking right now?',
    required: true,
    options: [
      'Fully committed to current projects',
      'Prefer direct client sourcing',
      'Not aligned with typical opportunities',
      'Timing not right',
      'Other',
    ],
    showIf: (fd) => fd.activityLevel === 'Not actively looking',
  },
  {
    // Free-text branch when Q15 = 'Other' (PDF: "Other (text)").
    id: 'notActiveReasonOther',
    type: 'text',
    label: 'Please specify',
    required: true,
    placeholder: 'Briefly describe',
    showIf: (fd) =>
      fd.activityLevel === 'Not actively looking' &&
      fd.notActiveReason === 'Other',
  },
];

const professionalQuestions: ProfileQuestions = { step1, step2, step3, step4, step5 };

export default professionalQuestions;
