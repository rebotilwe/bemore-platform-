import type { ApplicationStatus } from '../types/index.ts';

// Display labels shown to users. Keys must stay unchanged (they match backend/API
// values) — only the label text on the right changes.
// Per Mr Sthole: 'shortlisted' step now displays as 'Appraisal' (confirm exact
// spelling — he said "aprecial/aprezial"), 'invited' step now displays as 'Onboarded'.
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New', reviewing: 'Reviewing', shortlisted: 'Appraisal',
  invited: 'Onboarded', funded: 'Funded',
};

export const STATUS_CSS: Record<ApplicationStatus, string> = {
  new: 'st-new', reviewing: 'st-rev', shortlisted: 'st-shl',
  invited: 'st-inv', funded: 'st-fun',
};

export const STATUS_ORDER: ApplicationStatus[] = ['new', 'reviewing', 'shortlisted', 'invited', 'funded'];
export const APPLICATION_STATUSES: ApplicationStatus[] = ['new', 'reviewing', 'shortlisted', 'invited', 'funded'];