/* ---------------------------------------------------------------
   FLOW 05 — Built Environment Professional
   Step 4 includes multi-document upload for panel inclusion.
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

const DOCUMENT_ACCEPTED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
].join(',');

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
  {
    id: 'cv',
    type: 'file',
    label: 'Upload CV or company profile',
    required: false,
    accept: CV_ACCEPTED_MIME,
    maxSizeBytes: 5 * 1024 * 1024,
    helpText: 'PDF, DOC, or DOCX up to 5 MB. Optional but speeds up shortlist review.',
  },
  // NEW: Multi-document upload for panel inclusion
  {
    id: 'documents',
    type: 'file_group',
    label: 'Professional Documentation (For Panel Inclusion)',
    required: true,
    helpText: 'Please upload the following documents to be considered for the professional panel. All documents must be current and valid.',
    files: [
      {
        field: 'company_registration',
        label: 'Company Registration Certificate',
        required: true,
        accept: DOCUMENT_ACCEPTED_MIME,
        maxSizeBytes: 5 * 1024 * 1024,
        helpText: 'CIPC registration certificate for your company',
      },
      {
        field: 'tax_clearance',
        label: 'Tax Clearance Certificate',
        required: true,
        accept: DOCUMENT_ACCEPTED_MIME,
        maxSizeBytes: 5 * 1024 * 1024,
        helpText: 'Valid SARS Tax Clearance Certificate (valid for 12 months)',
      },
      {
        field: 'bee_certificate',
        label: 'B-BBEE Certificate/Affidavit',
        required: true,
        accept: DOCUMENT_ACCEPTED_MIME,
        maxSizeBytes: 5 * 1024 * 1024,
        helpText: 'Current B-BBEE Certificate or Sworn Affidavit',
      },
      {
        field: 'professional_indemnity',
        label: 'Professional Indemnity Insurance',
        required: true,
        accept: DOCUMENT_ACCEPTED_MIME,
        maxSizeBytes: 5 * 1024 * 1024,
        helpText: 'Valid Professional Indemnity Insurance Certificate',
      },
    ],
  },
];

const step5: Question[] = [
  {
    id: 'activityLevel',
    type: 'radio',
    label: 'How actively are you looking for new project opportunities right now?',
    required: true,
    options: ACTIVITY_LEVEL_OPTIONS,
  },
  {
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