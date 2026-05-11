/* ---------------------------------------------------------------
   Form step titles + labels.
   Aligned to spec §6.1 file rename + §5 step roles:
     Step 1 — Identity
     Step 2 — Position + Activity
     Step 3 — Constraints + Alignment
     Step 4 — Contact
     Step 5 — Feedback + Consent
   Per-profile overrides tailor the title/subtitle for steps 2 and 3
   where the PDF's section headings differ.
   ---------------------------------------------------------------*/

export interface StepMeta {
  title: string;
  subtitle: string;
  label: string;
}

export const FORM_STEPS: StepMeta[] = [
  { title: 'Tell us about you',           subtitle: 'Your identity and the entity you represent.',                  label: 'Identity'    },
  { title: 'Where you are today',         subtitle: 'Your current position and activity.',                          label: 'Position'    },
  { title: 'Constraints & alignment',     subtitle: 'What you are working through and what matters most.',          label: 'Constraints' },
  { title: 'Contact details',             subtitle: 'How we reach you.',                                            label: 'Contact'     },
  { title: 'Final thoughts',              subtitle: 'Where you are now, anything else to share, and consent.',      label: 'Feedback'    },
];

const DEVELOPER_OVERRIDES: Partial<StepMeta>[] = [
  { title: 'Tell us about your development activity', subtitle: 'You and the entity behind your projects.' },
  { title: 'Your development position',               subtitle: 'Stage, type, and scale of your work.', label: 'Position' },
  { title: 'Funding position & alignment',            subtitle: 'Where you are with capital and what matters when evaluating partners.', label: 'Constraints' },
  {},
  {},
];

const LANDOWNER_OVERRIDES: Partial<StepMeta>[] = [
  { title: 'Tell us about your land',  subtitle: 'Your identity and the land you hold.' },
  { title: 'Your land',                subtitle: 'Where it is and what you want to do with it.', label: 'Land' },
  { title: 'Land status & blockers',   subtitle: 'Zoning, work started, and what is preventing progress.', label: 'Constraints' },
  {},
  {},
];

const INVESTOR_OVERRIDES: Partial<StepMeta>[] = [
  { title: 'Tell us about you as an investor', subtitle: 'Your identity and how you invest.' },
  { title: 'Your investment focus',            subtitle: 'What you look for and how you invest.', label: 'Focus' },
  { title: 'Decision drivers & deployment',    subtitle: 'What guides your decisions and how actively you are deploying capital.', label: 'Drivers' },
  {},
  {},
];

const STUDENT_OVERRIDES: Partial<StepMeta>[] = [
  { title: 'Tell us about your operation',  subtitle: 'Your identity and your accommodation business.' },
  { title: 'Your portfolio',                subtitle: 'Size, locations, and operational reality.', label: 'Portfolio' },
  { title: 'Performance & growth',          subtitle: 'Occupancy and what limits your ability to scale.', label: 'Growth' },
  {},
  {},
];

const PROFESSIONAL_OVERRIDES: Partial<StepMeta>[] = [
  { title: 'Tell us about your professional profile', subtitle: 'Your identity and your role in the built environment.' },
  { title: 'Your market position',                    subtitle: 'Experience, provinces, and how you operate.', label: 'Position' },
  { title: 'Project exposure & alignment',            subtitle: 'Project types, size, and what matters when reviewing opportunities.', label: 'Exposure' },
  {},
  {},
];

const ASPIRING_OVERRIDES: Partial<StepMeta>[] = [
  { title: 'Tell us about your starting point', subtitle: 'Your identity and your development ambition.' },
  { title: 'Your background',                   subtitle: 'Exposure, access to land, and what you want to build.', label: 'Background' },
  { title: 'What is holding you back',          subtitle: 'Constraints and when you realistically want to start.', label: 'Constraints' },
  {},
  {},
];

const PROFILE_OVERRIDES: Record<string, Partial<StepMeta>[]> = {
  developer:    DEVELOPER_OVERRIDES,
  landowner:    LANDOWNER_OVERRIDES,
  investor:     INVESTOR_OVERRIDES,
  student:      STUDENT_OVERRIDES,
  professional: PROFESSIONAL_OVERRIDES,
  aspiring:     ASPIRING_OVERRIDES,
};

export function getStepMeta(stepIndex: number, profile?: string): StepMeta {
  const base = FORM_STEPS[stepIndex];
  if (profile && PROFILE_OVERRIDES[profile]) {
    const override = PROFILE_OVERRIDES[profile][stepIndex];
    return { ...base, ...override };
  }
  return base;
}
