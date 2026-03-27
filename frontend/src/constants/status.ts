import type { ApplicationStatus } from '../types/index.ts';

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New', reviewing: 'Reviewing', shortlisted: 'Shortlisted',
  invited: 'Invited', funded: 'Funded',
};

export const STATUS_CSS: Record<ApplicationStatus, string> = {
  new: 'st-new', reviewing: 'st-rev', shortlisted: 'st-shl',
  invited: 'st-inv', funded: 'st-fun',
};

export const STATUS_ORDER: ApplicationStatus[] = ['new', 'reviewing', 'shortlisted', 'invited', 'funded'];
