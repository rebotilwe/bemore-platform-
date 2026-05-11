/* ---------------------------------------------------------------
   Question schema — declarative per-profile form configs.
   See: docs/superpowers/specs/2026-05-11-onboarding-flow-update-design.md §6.2
   ---------------------------------------------------------------*/

export type QuestionType =
  | 'text'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'radio'
  | 'checkbox'
  | 'dropdown'
  | 'file';

/**
 * Option for radio / checkbox / dropdown.
 *
 * - String form: same value used for display and storage.
 * - Object form: `label` is shown to the user, `value` is what gets persisted
 *   to formData. Use this when the PDF wording for a profile differs from the
 *   canonical stored enum (e.g. spec §14 `activityLevel`).
 */
export type QuestionOption = string | { label: string; value: string };

export interface Question {
  /** formData key — see spec §7.2 */
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  /** option values for radio / checkbox / dropdown */
  options?: QuestionOption[];
  /** companion free-text "Other: ___" field, written to a sibling formData key */
  otherField?: { id: string; label: string };
  /** predicate used by the renderer + step-readiness; receives the live formData snapshot */
  showIf?: (formData: Record<string, unknown>) => boolean;
  /** synchronous validator — return string error message, or null if valid */
  validate?: (value: unknown) => string | null;
  placeholder?: string;
  helpText?: string;
  /** file inputs only — comma-separated MIME types for the `accept` attribute */
  accept?: string;
  /** file inputs only — enforced client-side before upload */
  maxSizeBytes?: number;
}

export interface ProfileQuestions {
  /** Step 1 — Identity */
  step1: Question[];
  /** Step 2 — Position + Activity */
  step2: Question[];
  /** Step 3 — Constraints + Alignment */
  step3: Question[];
  /** Step 4 — Contact (+ optional CV for Professional) */
  step4: Question[];
  /** Step 5 — Feedback (consent rendered separately by the step file) */
  step5: Question[];
}
