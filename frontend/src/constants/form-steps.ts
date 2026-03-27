export interface StepMeta {
  title: string;
  subtitle: string;
  label: string;
}

export const FORM_STEPS: StepMeta[] = [
  { title: 'Basic Information',      subtitle: 'Let\'s start with your contact details.',                  label: 'Info' },
  { title: 'Development Readiness',  subtitle: 'Tell us about your project status and readiness level.',   label: 'Readiness' },
  { title: 'Funding & Partnership',  subtitle: 'What kind of support are you looking for?',                label: 'Funding' },
  { title: 'Project Details',        subtitle: 'Describe your project and what sets you apart.',            label: 'Project' },
  { title: 'Confirmation & Consent', subtitle: 'Review the terms and submit your application.',             label: 'Confirm' },
];
