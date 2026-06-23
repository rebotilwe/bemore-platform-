/* ---------------------------------------------------------------
   nextStepReady — drives the "Next" button enable/disable state.
   Spec §6.4.

   - Walks the visible questions for the given step (respects `showIf`).
   - Runs each `validate` (if present) or default required check.
   - Hidden-by-`showIf` questions are NOT required.
   - Step 1 + Step 4 also enforce the `personal` fields (firstName / surname
     in Step 1, email + phone in Step 4) which are written directly to
     `store.personal` rather than through the question-group renderer.
   - Step 5 additionally requires the two consent toggles (T&Cs + POPIA).
   - Step 4 now supports `file_group` type for multi-document uploads.
   ---------------------------------------------------------------*/

import type { ProfileCategory, Personal } from '../types/index.ts';
import type { ProfileQuestions, Question, FileGroupConfig } from '../types/question.ts';
import { isEmail, isPhone } from './validation.ts';

import developerQs from '../constants/profiles/developer.questions.ts';
import landownerQs from '../constants/profiles/landowner.questions.ts';
import investorQs from '../constants/profiles/investor.questions.ts';
import studentQs from '../constants/profiles/student.questions.ts';
import professionalQs from '../constants/profiles/professional.questions.ts';
import aspiringQs from '../constants/profiles/aspiring.questions.ts';

const PROFILE_CONFIG: Record<ProfileCategory, ProfileQuestions> = {
  developer: developerQs,
  landowner: landownerQs,
  investor: investorQs,
  student: studentQs,
  professional: professionalQs,
  aspiring: aspiringQs,
};

const STEP_KEYS: (keyof ProfileQuestions)[] = ['step1', 'step2', 'step3', 'step4', 'step5'];

/**
 * Profiles where `personal.companyName` is required on Step 1. Mirrors the
 * UI-side `PROFILES_WITH_REQUIRED_COMPANY` constant in step-identity.ts.
 * Operator (Student) PDF Q2 explicitly requires Company.
 */
const PROFILES_WITH_REQUIRED_COMPANY: Set<ProfileCategory> = new Set(['student']);

// File group value type
interface FileGroupValue {
  field: string;
  filename: string;
  storedAs: string;
  size: number;
  mimeType: string;
  uploadedAt?: string;
  expiryDate?: string;
  isVerified?: boolean;
}

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    // For file group values, check if there's at least one uploaded file
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    // Check if object has any non-empty values
    for (const key of Object.keys(value as object)) {
      const val = (value as Record<string, unknown>)[key];
      if (val !== undefined && val !== null && val !== '') {
        return true;
      }
    }
    return false;
  }
  return true;
}

/**
 * Check if a file group has all required files uploaded
 */
function isFileGroupComplete(
  files: FileGroupValue[] | undefined,
  fileConfigs: FileGroupConfig[]
): boolean {
  if (!files || !Array.isArray(files)) {
    // Check if any required files exist
    const hasRequired = fileConfigs.some(f => f.required);
    return !hasRequired; // If no required files, it's complete
  }

  for (const fileConfig of fileConfigs) {
    if (fileConfig.required) {
      const uploaded = files.find(f => f.field === fileConfig.field);
      if (!uploaded || !uploaded.storedAs) {
        return false;
      }
    }
  }
  return true;
}

// ✅ FIXED: Removed the unused `formData` parameter
function questionPasses(q: Question, value: unknown): boolean {
  // Handle file_group type
  if (q.type === 'file_group' && q.files) {
    const files = value as FileGroupValue[] | undefined;
    return isFileGroupComplete(files, q.files);
  }

  // Handle single file upload
  if (q.type === 'file') {
    if (q.required) {
      const fileObj = value as { storedAs?: string } | undefined;
      return !!(fileObj && fileObj.storedAs);
    }
    return true;
  }

  if (q.validate) return q.validate(value) === null;
  if (q.required && !isFilled(value)) return false;
  return true;
}

/** Visible-question check. Caller supplies the live formData snapshot so
 *  `showIf` predicates evaluate against the current values. */
export function visibleQuestions(
  questions: Question[],
  formData: Record<string, unknown>,
): Question[] {
  return questions.filter(q => (q.showIf ? q.showIf(formData) : true));
}

export interface StepReadyContext {
  /** Optional `personal` snapshot. Required for Step 1 + Step 4 readiness. */
  personal?: Partial<Personal>;
  /** Step 5 only — both consent flags must be true. */
  consent?: { tc?: boolean; popia?: boolean };
  /** Step 4 only — file uploads in progress. */
  uploadInFlight?: boolean;
  /** Step 4 only — specific files that are currently uploading */
  uploadingFiles?: string[];
}

export function nextStepReady(
  stepIndex: number,
  profile: ProfileCategory,
  formData: Record<string, unknown>,
  ctx: StepReadyContext = {},
): boolean {
  return getMissingItems(stepIndex, profile, formData, ctx).length === 0;
}

/**
 * Return human-readable labels of the items that block the user from proceeding
 * past the given step. Empty array == ready. Order: personal → questions →
 * consents → uploadInFlight (the most actionable hints first).
 */
export function getMissingItems(
  stepIndex: number,
  profile: ProfileCategory,
  formData: Record<string, unknown>,
  ctx: StepReadyContext = {},
): string[] {
  const out: string[] = [];
  const config = PROFILE_CONFIG[profile];
  if (!config) return ['Unknown profile'];
  const stepKey = STEP_KEYS[stepIndex - 1];
  if (!stepKey) return ['Unknown step'];

  // Step 1 — personal: firstName + surname universal & required;
  // companyName required for profiles in PROFILES_WITH_REQUIRED_COMPANY.
  if (stepIndex === 1) {
    const p = ctx.personal ?? {};
    if (!isFilled(p.firstName)) out.push('First name');
    if (!isFilled(p.surname)) out.push('Surname');
    if (PROFILES_WITH_REQUIRED_COMPANY.has(profile) && !isFilled(p.companyName)) {
      out.push('Company name');
    }
  }

  // Visible question-config checks
  const visible = visibleQuestions(config[stepKey], formData);
  for (const q of visible) {
    // For file_group, we need to check the files array
    if (q.type === 'file_group' && q.files) {
      const files = formData[q.id] as FileGroupValue[] | undefined;
      for (const fileConfig of q.files) {
        if (fileConfig.required) {
          const uploaded = files?.find(f => f.field === fileConfig.field);
          if (!uploaded || !uploaded.storedAs) {
            out.push(fileConfig.label);
          }
        }
      }
      continue;
    }

    // Single file upload
    if (q.type === 'file') {
      if (q.required) {
        const fileObj = formData[q.id] as { storedAs?: string } | undefined;
        if (!fileObj || !fileObj.storedAs) {
          out.push(q.label.replace(/[?:.]+\s*$/, ''));
        }
      }
      continue;
    }

    // ✅ FIXED: Now only passing 2 arguments to questionPasses
    const value = formData[q.id];
    if (!questionPasses(q, value)) {
      // Strip trailing punctuation for cleaner toast copy.
      out.push(q.label.replace(/[?:.]+\s*$/, ''));
    }
  }

  // Step 4 — personal: email + phone universal; file uploads mid-flight blocks.
  if (stepIndex === 4) {
    const p = ctx.personal ?? {};
    if (!isFilled(p.email) || !isEmail(String(p.email))) out.push('Valid email address');
    if (!isFilled(p.phone) || !isPhone(String(p.phone))) out.push('Valid phone number');

    // Check for any file uploads in progress
    if (ctx.uploadInFlight) {
      out.push('Wait for file uploads to complete');
    }

    // Check for specific uploading files
    if (ctx.uploadingFiles && ctx.uploadingFiles.length > 0) {
      for (const field of ctx.uploadingFiles) {
        // Find the label for this field
        const fileGroupQuestions = visible.filter(q => q.type === 'file_group' && q.files);
        for (const fg of fileGroupQuestions) {
          const fileConfig = fg.files?.find(f => f.field === field);
          if (fileConfig) {
            out.push(`${fileConfig.label} upload in progress`);
          }
        }
      }
    }
  }

  // Step 5 — both consent boxes must be ticked.
  if (stepIndex === 5) {
    const c = ctx.consent ?? {};
    if (!c.tc) out.push('Terms & Conditions consent');
    if (!c.popia) out.push('POPIA consent');
  }

  return out;
}

export { PROFILE_CONFIG, STEP_KEYS };