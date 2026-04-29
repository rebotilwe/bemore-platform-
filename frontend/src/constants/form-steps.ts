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

const INVESTOR_OVERRIDES: Partial<StepMeta>[] = [
  {},
  { title: 'Investment Profile',   subtitle: 'Tell us about your investment mandate and appetite.',    label: 'Profile' },
  { title: 'Investment Intentions', subtitle: 'What opportunities are you looking for?',               label: 'Intentions' },
  { title: 'Additional Notes',     subtitle: 'Anything else you\'d like us to know?',                  label: 'Notes' },
  {},
];

export function getStepMeta(stepIndex: number, profile?: string): StepMeta {
  const base = FORM_STEPS[stepIndex];
  if (profile === 'investor') {
    const override = INVESTOR_OVERRIDES[stepIndex];
    return { ...base, ...override };
  }
  return base;
}
