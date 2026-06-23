/* ---------------------------------------------------------------
   form.ts — Main form page with file_group support
   ---------------------------------------------------------------*/

import type { Page, ProfileCategory, AttachmentRef } from '../../types/index.ts';
import type { Question, FileGroupConfig } from '../../types/question.ts';
import { store } from '../../store.ts';
import { navigate } from '../../router.ts';
import { FORM_STEPS, getStepMeta } from '../../constants/form-steps.ts';
import { toast } from '../../components/toast.ts';
import { api } from '../../api.ts';
import { normalizePhone } from '../../utils/validation.ts';
import { getMissingItems, PROFILE_CONFIG } from '../../utils/step-readiness.ts';
import { renderStepIdentity, mountStepIdentity } from './form-steps/step-identity.ts';
import { renderStepPosition, mountStepPosition } from './form-steps/step-position.ts';
import { renderStepConstraints, mountStepConstraints } from './form-steps/step-constraints.ts';
import { renderStepContact, mountStepContact } from './form-steps/step-contact.ts';
import { renderStepFeedbackConsent, mountStepFeedbackConsent } from './form-steps/step-feedback-consent.ts';
import { tracker } from '../../services/tracker.ts';

const TOTAL = 5;

interface PersonalSlice {
  firstName?: string;
  surname?: string;
  companyName?: string;
  email?: string;
  phone?: string;
}

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

function getFD(): Record<string, unknown> {
  return (store.get('formData') ?? {}) as Record<string, unknown>;
}

function getPersonal(): PersonalSlice {
  return (getFD().personal as PersonalSlice) ?? {};
}

function getStep(): number { return store.get('currentStep'); }

/* ══════════════════════════════════════════════
   File Group Rendering
   ══════════════════════════════════════════════ */

function renderFileGroup(question: Question, fd: Record<string, unknown>): string {
  const files = (fd[question.id] as FileGroupValue[]) || [];
  const fileGroup = question as Question & { files: FileGroupConfig[] };
  
  let html = `
    <div class="file-group-container">
      <p class="file-group-help">${question.helpText || 'Please upload the required documents'}</p>
      <div class="file-group-list">
  `;
  
  for (const fileConfig of fileGroup.files || []) {
    const existing = files.find(f => f.field === fileConfig.field);
    const isRequired = fileConfig.required;
    const statusClass = existing ? 'uploaded' : (isRequired ? 'required' : 'optional');
    const statusText = existing ? '✅ Uploaded' : (isRequired ? '⚠️ Required' : 'Optional');
    
    html += `
      <div class="file-group-item" data-field="${fileConfig.field}">
        <div class="file-group-header">
          <span class="file-group-label">${fileConfig.label}</span>
          <span class="file-group-status ${statusClass}">${statusText}</span>
        </div>
        <div class="file-group-input">
          <input 
            type="file" 
            id="file-${fileConfig.field}" 
            name="file-${fileConfig.field}"
            accept="${fileConfig.accept || '.pdf,.jpg,.png'}"
            data-field="${fileConfig.field}"
            ${isRequired ? 'data-required="true"' : ''}
          />
          <label for="file-${fileConfig.field}" class="file-upload-btn">
            ${existing ? '🔄 Replace' : '📎 Choose File'}
          </label>
          ${fileConfig.helpText ? `<small class="file-help">${fileConfig.helpText}</small>` : ''}
          ${existing ? `<span class="file-name">📄 ${existing.filename}</span>` : ''}
          ${existing ? `<span class="file-size">(${(existing.size / 1024).toFixed(0)} KB)</span>` : ''}
          ${existing && existing.expiryDate ? `<span class="file-expiry">Expires: ${new Date(existing.expiryDate).toLocaleDateString()}</span>` : ''}
        </div>
        <div class="file-upload-progress" style="display:none">
          <div class="progress-bar" style="width:0%"></div>
        </div>
      </div>
    `;
  }
  
  html += `
      </div>
    </div>
  `;
  
  return html;
}

/**
 * Handle file upload for a file group
 * Uses api.uploadDocument for multi-document uploads
 */
async function handleFileGroupUpload(
  field: string, 
  file: File
): Promise<FileGroupValue | null> {
  try {
    const result = await api.uploadDocument(file, field);
    
    if (result.success && result.data) {
      return {
        field: field,
        filename: result.data.filename,
        storedAs: result.data.storedAs,
        size: result.data.size,
        mimeType: result.data.mimeType,
        expiryDate: result.data.expiryDate || undefined,
      };
    }
    throw new Error(result.message || 'Upload failed');
  } catch (error) {
    const err = error as Error;
    console.error('Upload error:', err);
    toast(`Failed to upload ${field}: ${err.message}`);
    return null;
  }
}

/* ══════════════════════════════════════════════
   Render helpers
   ══════════════════════════════════════════════ */

function renderProgress(): string {
  const step = getStep();
  let html = `<div class="ps"><div class="ps-dot done">✓</div><div class="ps-lbl done">Profile</div></div>`;
  const profile = store.get('selectedProfile') ?? undefined;
  for (let i = 0; i < TOTAL; i++) {
    const s = i + 1;
    const dotClass = s < step ? 'done' : s === step ? 'active' : 'idle';
    const lblClass = s <= step ? (s < step ? 'done' : 'active') : '';
    const lineClass = s <= step ? 'done' : '';
    html += `<div class="prog-line ${lineClass}"></div>`;
    html += `<div class="ps"><div class="ps-dot ${dotClass}">${s < step ? '✓' : s + 1}</div><div class="ps-lbl ${lblClass}">${getStepMeta(i, profile).label}</div></div>`;
  }
  return html;
}

function renderStepContent(): string {
  const profile = store.get('selectedProfile')!;
  const fd = getFD();
  
  switch (getStep()) {
    case 1: return renderStepIdentity(profile);
    case 2: return renderStepPosition(profile);
    case 3: return renderStepConstraints(profile);
    case 4: {
      const config = PROFILE_CONFIG[profile];
      const fileGroupQuestions = config?.step4?.filter(q => q.type === 'file_group') || [];
      
      let html = renderStepContact(profile);
      
      for (const q of fileGroupQuestions) {
        html += renderFileGroup(q, fd);
      }
      
      return html;
    }
    case 5: return renderStepFeedbackConsent(profile);
    default: return '';
  }
}

/* ══════════════════════════════════════════════
   In-page step navigation (no hash change)
   ══════════════════════════════════════════════ */

function goToStep(newStep: number): void {
  const prevStep = getStep();
  if (newStep > prevStep) {
    const stepLabel = FORM_STEPS[prevStep - 1]?.title || `Step ${prevStep}`;
    tracker.trackEvent('form_funnel', 'form_step_complete', stepLabel, prevStep);
  }
  store.set('currentStep', newStep);

  const body = document.querySelector('.form-body');
  const prog = document.querySelector('.prog-steps');
  const foot = document.querySelector('.form-btns');
  const stepLbl = document.querySelector('.form-step-lbl');
  const backBtn = document.getElementById('form-back');
  if (!body || !prog || !foot) return;

  const step = newStep;
  const meta = getStepMeta(step - 1, store.get('selectedProfile') ?? undefined);
  const isLast = step === TOTAL;

  body.innerHTML = `
    <h2 class="form-title">${meta.title}</h2>
    <p class="form-sub">${meta.subtitle}</p>
    <div class="form-step active">${renderStepContent()}</div>`;

  prog.innerHTML = renderProgress();

  foot.innerHTML = `
    ${step > 1 ? '<button class="btn-secondary" id="btn-prev" data-track="Form — Previous">← Previous</button>' : ''}
    ${!isLast ? '<button class="btn-primary" id="btn-next" data-track="Form — Continue">Continue →</button>' : ''}
    ${isLast ? '<button class="btn-primary" id="btn-submit" data-track="Form — Submit">Submit →</button>' : ''}`;

  if (stepLbl) stepLbl.textContent = `STEP ${step + 1} OF ${TOTAL + 1}`;
  if (backBtn) backBtn.textContent = step === 1 ? '← Change Profile' : '← Back';

  mountCurrentStep();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════
   Validation — driven entirely by spec §6.4 nextStepReady()
   ══════════════════════════════════════════════ */

function validate(): boolean {
  const step = getStep();
  const profile = store.get('selectedProfile')!;
  const fd = getFD();
  const ctx = {
    personal: getPersonal(),
    consent: (fd.consent as { tc?: boolean; popia?: boolean }) ?? {},
    uploadInFlight: Boolean(fd.__uploadInFlight),
  };
  const missing = getMissingItems(step, profile, fd, ctx);
  console.log('🔍 Validation missing items:', missing);
  console.log('🔍 Documents in formData:', fd.documents);
  
  if (missing.length === 0) return true;

  if (step === 4 && ctx.uploadInFlight) {
    toast('Please wait for the upload to finish.');
  } else if (missing.length === 1) {
    toast(`Please complete: ${missing[0]}`);
  } else if (missing.length <= 3) {
    toast(`Please complete: ${missing.join(', ')}`);
  } else {
    toast(`Please complete: ${missing.slice(0, 3).join(', ')} and ${missing.length - 3} more`);
  }
  return false;
}

/* ══════════════════════════════════════════════
   Collect submission body — spec §7.2 keys ONLY
   ══════════════════════════════════════════════ */

function collectAllFormData(profile: ProfileCategory): Record<string, unknown> {
  const fd = getFD();
  const config = PROFILE_CONFIG[profile];
  const ids = new Set<string>();
  
  for (const stepKey of ['step1', 'step2', 'step3', 'step4', 'step5'] as const) {
    for (const q of config[stepKey]) {
      if (q.type === 'file' || q.type === 'file_group') continue;
      ids.add(q.id);
    }
  }

  const out: Record<string, unknown> = {};
  for (const id of ids) {
    if (id in fd) out[id] = fd[id];
  }
  return out;
}

/* ══════════════════════════════════════════════
   Mount — wire event listeners for current step
   ══════════════════════════════════════════════ */

function mountCurrentStep(): void {
  const step = getStep();
  const profile = store.get('selectedProfile')!;

  if (step === 1) mountStepIdentity(profile);
  if (step === 2) mountStepPosition(profile);
  if (step === 3) mountStepConstraints(profile);
  if (step === 4) {
    mountStepContact(profile);
    mountFileGroupUploads();
  }
  if (step === 5) mountStepFeedbackConsent(profile);

  addListener(document.getElementById('btn-prev'), 'click', () => goToStep(step - 1));
  addListener(document.getElementById('btn-next'), 'click', () => {
    if (validate()) goToStep(step + 1);
  });
  addListener(document.getElementById('btn-submit'), 'click', handleSubmit);
}

/**
 * Mount file group upload handlers
 */
function mountFileGroupUploads(): void {
  const fileInputs = document.querySelectorAll('.file-group-input input[type="file"]');
  
  for (const input of fileInputs) {
    const field = input.getAttribute('data-field');
    if (!field) continue;
    
    input.removeEventListener('change', handleFileInputChange);
    input.addEventListener('change', handleFileInputChange);
  }
}

let uploadingFiles: Set<string> = new Set();

/**
 * Handle file input change - upload file and update store
 */
async function handleFileInputChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const field = input.getAttribute('data-field');
  if (!field || !input.files || input.files.length === 0) return;

  const file = input.files[0];
  const questionId = 'documents';
  
  const profile = store.get('selectedProfile')!;
  const config = PROFILE_CONFIG[profile];
  const fileGroupQuestions = config?.step4?.filter(q => q.type === 'file_group') || [];
  const fileGroupQ = fileGroupQuestions.find(q => q.files?.some(f => f.field === field));
  if (!fileGroupQ) return;

  const item = input.closest('.file-group-item');
  const progress = item?.querySelector('.file-upload-progress') as HTMLElement | null;
  const progressBar = progress?.querySelector('.progress-bar') as HTMLElement | null;
  if (progress) progress.style.display = 'block';
  if (progressBar) progressBar.style.width = '30%';

  uploadingFiles.add(field);
  let fd = getFD();
  fd.__uploadInFlight = true;
  store.set('formData', fd);

  try {
    const result = await handleFileGroupUpload(field, file);

    if (progressBar) progressBar.style.width = '100%';

    if (result) {
      const currentFd = getFD();
      
      let files = (currentFd[questionId] as FileGroupValue[]) || [];
      
      const existingIndex = files.findIndex(f => f.field === field);
      if (existingIndex >= 0) {
        files[existingIndex] = result;
      } else {
        files.push(result);
      }
      
      currentFd[questionId] = files;
      currentFd.__uploadInFlight = false;
      
      store.set('formData', currentFd);
      
      const verify = store.get('formData');
      console.log('✅ Documents saved:', verify?.documents);
      
      const status = input.closest('.file-group-item')?.querySelector('.file-group-status');
      const fileName = input.closest('.file-group-input')?.querySelector('.file-name');
      const fileSize = input.closest('.file-group-input')?.querySelector('.file-size');
      const fileExpiry = input.closest('.file-group-input')?.querySelector('.file-expiry');
      const uploadBtn = input.closest('.file-group-input')?.querySelector('.file-upload-btn');

      if (status) {
        status.textContent = '✅ Uploaded';
        status.className = 'file-group-status uploaded';
      }
      if (fileName) fileName.textContent = `📄 ${result.filename}`;
      if (fileSize) fileSize.textContent = `(${(result.size / 1024).toFixed(0)} KB)`;
      if (uploadBtn) uploadBtn.textContent = '🔄 Replace';
      if (fileExpiry && result.expiryDate) {
        fileExpiry.textContent = `Expires: ${new Date(result.expiryDate).toLocaleDateString()}`;
      }
      if (progress) progress.style.display = 'none';

      toast(`✅ ${field} uploaded successfully`);
    } else {
      const currentFd = getFD();
      currentFd.__uploadInFlight = false;
      store.set('formData', currentFd);
      if (progress) progress.style.display = 'none';
      if (progressBar) progressBar.style.width = '0%';
    }
  } catch (error) {
    const currentFd = getFD();
    currentFd.__uploadInFlight = false;
    store.set('formData', currentFd);
    if (progress) progress.style.display = 'none';
    if (progressBar) progressBar.style.width = '0%';
    console.error('Upload error:', error);
    toast(`❌ Failed to upload ${field}`);
  } finally {
    uploadingFiles.delete(field);
    const currentFd = getFD();
    if (uploadingFiles.size === 0) {
      currentFd.__uploadInFlight = false;
      store.set('formData', currentFd);
    }
    input.value = '';
  }
}

let submitting = false;

async function handleSubmit(): Promise<void> {
  if (submitting) return;
  if (!validate()) return;
  
  const fd = getFD();
  if (fd.__uploadInFlight || uploadingFiles.size > 0) {
    toast('Please wait for all uploads to complete before submitting.');
    return;
  }
  
  submitting = true;
  const btn = document.getElementById('btn-submit') as HTMLButtonElement;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Submitting...';
  }

  try {
    const profile = store.get('selectedProfile')!;
    const fd2 = getFD();
    const personal = getPersonal();
    const formData = collectAllFormData(profile);
    
    const attachments: AttachmentRef[] = [];
    
    const cv = fd2.cv as { storedAs?: string; filename?: string } | undefined;
    if (cv?.storedAs) {
      attachments.push({
        field: 'cv',
        filename: cv.filename || 'cv.pdf',
        storedAs: cv.storedAs,
      });
    }
    
    const documents = fd2.documents as FileGroupValue[] | undefined;
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        if (doc.storedAs) {
          attachments.push({
            field: doc.field,
            filename: doc.filename || 'document.pdf',
            storedAs: doc.storedAs,
          });
        }
      }
    }

    const payload = {
      userType: profile,
      personal: {
        firstName: (personal.firstName ?? '').trim(),
        surname: (personal.surname ?? '').trim(),
        email: (personal.email ?? '').trim().toLowerCase(),
        phone: normalizePhone((personal.phone ?? '').trim()),
        companyName: personal.companyName?.trim() || undefined,
      },
      formData,
      attachments: attachments.length ? attachments : undefined,
      engagementSource: sessionStorage.getItem('bm_source') || 'direct',
      consent: (fd2.consent as Record<string, unknown>) ?? { tc: false, popia: false },
    };

    console.log('📤 Submitting payload:', JSON.stringify(payload, null, 2));

    const result = await api.submit(payload);

    if (result.success && result.data) {
      tracker.trackEvent('form_funnel', 'form_submitted', profile, TOTAL);
      store.set('formData', { refNumber: result.data.refNumber });
      store.set('currentStep', 1);
      navigate('/success');
    } else {
      const msg = result.message || 'Submission failed';
      const isNetwork = msg.toLowerCase().includes('network');
      toast(isNetwork
        ? 'No internet connection. Your data is saved — please try again when online.'
        : msg);
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Retry Submission →';
      }
    }
  } finally {
    submitting = false;
  }
}

/* ══════════════════════════════════════════════
   Page export
   ══════════════════════════════════════════════ */

let cleanupFns: (() => void)[] = [];

function addListener<K extends keyof HTMLElementEventMap>(
  el: HTMLElement | null,
  event: K,
  handler: (e: HTMLElementEventMap[K]) => void,
): void {
  if (!el) return;
  el.addEventListener(event, handler);
  cleanupFns.push(() => el.removeEventListener(event, handler));
}

export const formPage: Page = {
  render() {
    const step = getStep();
    const meta = getStepMeta(step - 1, store.get('selectedProfile') ?? undefined);
    const isLast = step === TOTAL;
    return `
    <section class="form-view">
      <div class="form-bar">
        <button class="btn-ghost" id="form-back" data-track="Form — Back">${step === 1 ? '← Change Profile' : '← Back'}</button>
        <span class="form-step-lbl mono">STEP ${step + 1} OF ${TOTAL + 1}</span>
      </div>
      <div class="form-prog"><div class="prog-steps">${renderProgress()}</div></div>
      <div class="form-body">
        <h2 class="form-title">${meta.title}</h2>
        <p class="form-sub">${meta.subtitle}</p>
        <div class="form-step active">${renderStepContent()}</div>
      </div>
      <div class="form-foot">
        <p class="form-note"><strong>🔒 Secure</strong> · SSL Encrypted · POPIA Compliant · <span id="save-indicator" class="save-indicator">Progress auto-saved</span></p>
        <div class="form-btns">
          ${step > 1 ? '<button class="btn-secondary" id="btn-prev" data-track="Form — Previous">← Previous</button>' : ''}
          ${!isLast ? '<button class="btn-primary" id="btn-next" data-track="Form — Continue">Continue →</button>' : ''}
          ${isLast ? '<button class="btn-primary" id="btn-submit" data-track="Form — Submit">Submit →</button>' : ''}
        </div>
      </div>
    </section>`;
  },
  mount() {
    cleanupFns = [];
    submitting = false;
    uploadingFiles.clear();
    tracker.trackEvent('form_funnel', 'form_start', store.get('selectedProfile') || '', 1);
    addListener(document.getElementById('form-back'), 'click', () => {
      if (getStep() === 1) navigate('/gateway');
      else goToStep(getStep() - 1);
    });
    mountCurrentStep();
  },
  unmount() {
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];
  },
};

// Re-export for tests
export { collectAllFormData };