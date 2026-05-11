import type { Page, ProfileCategory, AttachmentRef } from '../../types/index.ts';
import { store } from '../../store.ts';
import { navigate } from '../../router.ts';
import { FORM_STEPS, getStepMeta } from '../../constants/form-steps.ts';
import { toast } from '../../components/toast.ts';
import { api } from '../../api.ts';
import { normalizePhone } from '../../utils/validation.ts';
import { getMissingItems } from '../../utils/step-readiness.ts';
import { PROFILE_CONFIG } from '../../utils/step-readiness.ts';
import { renderStepIdentity, mountStepIdentity } from './form-steps/step-identity.ts';
import { renderStepPosition, mountStepPosition } from './form-steps/step-position.ts';
import { renderStepConstraints, mountStepConstraints } from './form-steps/step-constraints.ts';
import { renderStepContact, mountStepContact } from './form-steps/step-contact.ts';
import { renderStepFeedbackConsent, mountStepFeedbackConsent } from './form-steps/step-feedback-consent.ts';
import { tracker } from '../../services/tracker.ts';

const TOTAL = 5;

/* ══════════════════════════════════════════════
   formData layout (in store):
     {
       personal: { firstName, surname, email, phone, companyName? },
       attachments?: [{ field: 'cv', filename, storedAs }],
       consent?:    { tc: bool, popia: bool },
       __uploadInFlight?: boolean,    // step-contact transient flag
       ...question-config field IDs (spec §7.2)...
     }
   ══════════════════════════════════════════════ */

interface PersonalSlice {
  firstName?: string;
  surname?: string;
  companyName?: string;
  email?: string;
  phone?: string;
}

function getFD(): Record<string, unknown> {
  return (store.get('formData') ?? {}) as Record<string, unknown>;
}

function getPersonal(): PersonalSlice {
  return (getFD().personal as PersonalSlice) ?? {};
}

function getStep(): number { return store.get('currentStep'); }

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
  switch (getStep()) {
    case 1: return renderStepIdentity(profile);
    case 2: return renderStepPosition(profile);
    case 3: return renderStepConstraints(profile);
    case 4: return renderStepContact(profile);
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
  // The spec §7.2 IDs for this profile = union of question IDs across steps 2,3,5
  // (Step 1 + Step 4 carry no formData IDs except Professional `cv` which is
  // routed to attachments[], not formData).
  const ids = new Set<string>();
  for (const stepKey of ['step2', 'step3', 'step5'] as const) {
    for (const q of config[stepKey]) ids.add(q.id);
  }
  // Step 1 + Step 4 *can* carry formData IDs for some profiles (Professional
  // has `primaryRole` on Step 1). Include those too — but skip `cv`.
  for (const stepKey of ['step1', 'step4'] as const) {
    for (const q of config[stepKey]) {
      if (q.id !== 'cv') ids.add(q.id);
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
  if (step === 4) mountStepContact(profile);
  if (step === 5) mountStepFeedbackConsent(profile);

  addListener(document.getElementById('btn-prev'), 'click', () => goToStep(step - 1));
  addListener(document.getElementById('btn-next'), 'click', () => {
    if (validate()) goToStep(step + 1);
  });
  addListener(document.getElementById('btn-submit'), 'click', handleSubmit);
}

let submitting = false;
async function handleSubmit(): Promise<void> {
  if (submitting) return;
  if (!validate()) return;
  submitting = true;
  const btn = document.getElementById('btn-submit') as HTMLButtonElement;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Submitting...';
  }

  try {
    const profile = store.get('selectedProfile')!;
    const fd = getFD();
    const personal = getPersonal();
    const formData = collectAllFormData(profile);
    const attachments = (fd.attachments as AttachmentRef[] | undefined) ?? [];

    const result = await api.submit({
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
      // Server-side validation also enforces both flags === true (POPIA).
      // Use a SAFE-FAIL default — if `fd.consent` is somehow missing the
      // server rejects rather than silently forging consent. The Submit
      // button is gated by validate() / getMissingItems() so this fallback
      // should never fire in practice.
      consent: (fd.consent as Record<string, unknown>) ?? { tc: false, popia: false },
    });

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
    // Always release the in-flight lock. The success path navigates away (a
    // fresh formPage.mount() also resets this defensively), but the flag
    // must clear so back-navigation + resubmit + any unhandled exception
    // can't strand the form with a dead Submit button.
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
    // Reset module-level submit lock so back-navigation from /success can never
    // strand the Submit button silently disabled.
    submitting = false;
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
