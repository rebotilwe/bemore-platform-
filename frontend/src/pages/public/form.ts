import type { Page } from '../../types/index.ts';
import { store } from '../../store.ts';
import { navigate } from '../../router.ts';
import { FORM_STEPS } from '../../constants/form-steps.ts';
import { toast } from '../../components/toast.ts';
import { api } from '../../api.ts';
import { inputVal, setError } from '../../utils/dom.ts';
import { isEmail, isPhone, minLength, required, normalizePhone } from '../../utils/validation.ts';
import { renderStepBasic } from './form-steps/step-basic.ts';
import { renderStepReadiness, mountStepReadiness } from './form-steps/step-readiness.ts';
import { renderStepFunding, mountStepFunding } from './form-steps/step-funding.ts';
import { renderStepProject } from './form-steps/step-project.ts';
import { renderStepConfirm, mountStepConfirm } from './form-steps/step-confirm.ts';

const TOTAL = 5;

/* ══════════════════════════════════════════════
   State persistence — save DOM values to store
   before leaving a step, restore when returning
   ══════════════════════════════════════════════ */

function saveCurrentStepData(): void {
  const saved = (store.get('formData') ?? {}) as Record<string, unknown>;
  // Save all text inputs and selects
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    '.form-step.active input, .form-step.active select, .form-step.active textarea'
  ).forEach(el => {
    if (el.id) saved[`__input_${el.id}`] = el.value;
  });
  // Save radio selections
  document.querySelectorAll<HTMLElement>('.form-step.active .rg').forEach(rg => {
    if (!rg.id) return;
    const sel = rg.querySelector('.ro.sel');
    saved[`__radio_${rg.id}`] = sel?.textContent?.trim() ?? '';
  });
  // Save checkbox selections
  document.querySelectorAll<HTMLElement>('.form-step.active .cg').forEach(cg => {
    if (!cg.id) return;
    const vals = [...cg.querySelectorAll('.co.sel')].map(e => e.textContent?.trim() ?? '');
    saved[`__checks_${cg.id}`] = vals;
  });
  // Save consent toggles
  document.querySelectorAll<HTMLElement>('.form-step.active .consent-row').forEach(row => {
    if (row.id) saved[`__consent_${row.id}`] = row.classList.contains('sel');
  });
  store.set('formData', saved);
  // Flash save indicator
  const indicator = document.getElementById('save-indicator');
  if (indicator) {
    indicator.classList.add('saved');
    setTimeout(() => indicator.classList.remove('saved'), 1500);
  }
}

function restoreStepData(): void {
  const saved = (store.get('formData') ?? {}) as Record<string, unknown>;
  // Restore text inputs and selects
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    '.form-step.active input, .form-step.active select, .form-step.active textarea'
  ).forEach(el => {
    const val = saved[`__input_${el.id}`];
    if (el.id && typeof val === 'string') el.value = val;
  });
  // Restore radios
  document.querySelectorAll<HTMLElement>('.form-step.active .rg').forEach(rg => {
    if (!rg.id) return;
    const val = saved[`__radio_${rg.id}`] as string;
    if (!val) return;
    rg.querySelectorAll('.ro').forEach(ro => {
      const match = ro.textContent?.trim() === val;
      ro.classList.toggle('sel', match);
      ro.setAttribute('aria-checked', String(match));
    });
  });
  // Restore checkboxes
  document.querySelectorAll<HTMLElement>('.form-step.active .cg').forEach(cg => {
    if (!cg.id) return;
    const vals = (saved[`__checks_${cg.id}`] ?? []) as string[];
    cg.querySelectorAll('.co').forEach(co => {
      const match = vals.includes(co.textContent?.trim() ?? '');
      co.classList.toggle('sel', match);
      co.setAttribute('aria-checked', String(match));
    });
  });
  // Restore consent toggles
  document.querySelectorAll<HTMLElement>('.form-step.active .consent-row').forEach(row => {
    if (!row.id) return;
    const val = saved[`__consent_${row.id}`] as boolean;
    if (val) { row.classList.add('sel'); row.setAttribute('aria-checked', 'true'); }
  });
  // Update textarea counters
  document.querySelectorAll<HTMLTextAreaElement>('.form-step.active .fta').forEach(ta => {
    const countEl = ta.parentElement?.querySelector('.fta-count span');
    if (countEl) countEl.textContent = String(ta.value.length);
  });
}

/* ══════════════════════════════════════════════
   Render helpers
   ══════════════════════════════════════════════ */

function getStep(): number { return store.get('currentStep'); }

function renderProgress(): string {
  const step = getStep();
  let html = `<div class="ps"><div class="ps-dot done">✓</div><div class="ps-lbl done">Profile</div></div>`;
  for (let i = 0; i < TOTAL; i++) {
    const s = i + 1;
    const dotClass = s < step ? 'done' : s === step ? 'active' : 'idle';
    const lblClass = s <= step ? (s < step ? 'done' : 'active') : '';
    const lineClass = s <= step ? 'done' : '';
    html += `<div class="prog-line ${lineClass}"></div>`;
    html += `<div class="ps"><div class="ps-dot ${dotClass}">${s < step ? '✓' : s + 1}</div><div class="ps-lbl ${lblClass}">${FORM_STEPS[i].label}</div></div>`;
  }
  return html;
}

function renderStepContent(): string {
  const profile = store.get('selectedProfile')!;
  switch (getStep()) {
    case 1: return renderStepBasic();
    case 2: return renderStepReadiness(profile);
    case 3: return renderStepFunding();
    case 4: return renderStepProject();
    case 5: return renderStepConfirm();
    default: return '';
  }
}

/* ══════════════════════════════════════════════
   In-page step navigation (no hash change!)
   ══════════════════════════════════════════════ */

function goToStep(newStep: number): void {
  saveCurrentStepData();
  store.set('currentStep', newStep);
  // Re-render just the form content area — NOT the whole page
  const body = document.querySelector('.form-body');
  const prog = document.querySelector('.prog-steps');
  const foot = document.querySelector('.form-btns');
  const stepLbl = document.querySelector('.form-step-lbl');
  const backBtn = document.getElementById('form-back');
  if (!body || !prog || !foot) return;

  const step = newStep;
  const meta = FORM_STEPS[step - 1];
  const isLast = step === TOTAL;

  body.innerHTML = `
    <h2 class="form-title">${meta.title}</h2>
    <p class="form-sub">${meta.subtitle}</p>
    <div class="form-step active">${renderStepContent()}</div>`;

  prog.innerHTML = renderProgress();

  foot.innerHTML = `
    ${step > 1 ? '<button class="btn-secondary" id="btn-prev">← Previous</button>' : ''}
    ${!isLast ? '<button class="btn-primary" id="btn-next">Continue →</button>' : ''}
    ${isLast ? '<button class="btn-primary" id="btn-submit">Submit Application →</button>' : ''}`;

  if (stepLbl) stepLbl.textContent = `STEP ${step + 1} OF ${TOTAL + 1}`;
  if (backBtn) {
    backBtn.textContent = step === 1 ? '← Change Profile' : '← Back';
  }

  mountCurrentStep();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════
   Validation
   ══════════════════════════════════════════════ */

function getRadioVal(gid: string): string {
  const sel = document.querySelector(`#${gid} .ro.sel`);
  return sel?.textContent?.trim() ?? '';
}

function getCheckedVals(gid: string): string[] {
  return [...document.querySelectorAll(`#${gid} .co.sel`)].map(e => e.textContent?.trim() ?? '');
}

function validate(): boolean {
  const step = getStep();
  if (step === 1) {
    let ok = true;
    ['f-fn', 'f-sn', 'f-em', 'f-ph'].forEach(id => {
      setError(id, false);
      if (!required(inputVal(id))) { setError(id, true); ok = false; }
    });
    if (ok && !isEmail(inputVal('f-em'))) { setError('f-em', true); toast('Please enter a valid email address'); return false; }
    if (ok && !isPhone(inputVal('f-ph'))) { setError('f-ph', true); toast('Please enter a valid SA phone number (e.g. 082 123 4567)'); return false; }
    if (!ok) toast('Please complete all required fields');
    return ok;
  }
  if (step === 2) {
    if (!getRadioVal('r-land')) { toast('Please select your land status'); return false; }
    setError('s-stage', false); setError('s-value', false);
    let ok = true;
    if (!inputVal('s-stage')) { setError('s-stage', true); ok = false; }
    if (!inputVal('s-value')) { setError('s-value', true); ok = false; }
    if (!ok) toast('Please complete all required fields');
    return ok;
  }
  if (step === 3) {
    if (!getCheckedVals('c-seeking').length) { toast('Please select at least one option'); return false; }
    if (!getRadioVal('r-prevfund')) { toast('Please select your funding history'); return false; }
    return true;
  }
  if (step === 4) {
    setError('t-project', false); setError('t-why', false);
    if (!minLength(inputVal('t-project'), 50)) { setError('t-project', true); toast('Please describe your project (min 50 characters)'); return false; }
    if (!minLength(inputVal('t-why'), 50)) { setError('t-why', true); toast('Please explain why BeMore should choose you (min 50 characters)'); return false; }
    return true;
  }
  if (step === 5) {
    if (!getRadioVal('r-attend')) { toast('Please confirm your summit attendance'); return false; }
    if (!document.getElementById('consent-tc')?.classList.contains('sel')) { toast('Please accept the Terms & Conditions'); return false; }
    if (!document.getElementById('consent-popia')?.classList.contains('sel')) { toast('Please provide POPIA consent'); return false; }
    return true;
  }
  return true;
}

/* ══════════════════════════════════════════════
   Collect all data for submission
   ══════════════════════════════════════════════ */

function collectAllFormData(): Record<string, unknown> {
  // Merge all saved step data with current step data
  saveCurrentStepData();
  const saved = (store.get('formData') ?? {}) as Record<string, unknown>;

  const get = (key: string) => (saved[`__input_${key}`] as string) ?? '';
  const getRad = (key: string) => (saved[`__radio_${key}`] as string) ?? '';
  const getChk = (key: string) => ((saved[`__checks_${key}`] ?? []) as string[]);
  const profile = store.get('selectedProfile')!;

  const data: Record<string, unknown> = {
    landStatus: getRad('r-land'),
    projectStage: get('s-stage'),
    estimatedValue: get('s-value'),
    seeking: getChk('c-seeking'),
    previousFunding: getRad('r-prevfund'),
    projectDescription: get('t-project'),
    whyChooseYou: get('t-why'),
    summitAttendance: getRad('r-attend'),
    tcAccepted: true, popiaConsent: true,
  };

  if (profile === 'developer') { data.yearsExperience = get('a-exp'); data.developmentTypes = getChk('a-dtype'); }
  else if (profile === 'landowner') { data.landSize = get('b-size'); data.zoningStatus = get('b-zone'); data.isServiced = getRad('b-serv'); data.ownershipStructure = get('b-own'); }
  else if (profile === 'investor') { data.investmentFocus = getChk('inv-focus'); data.investmentTicket = get('inv-ticket'); }
  else if (profile === 'student') { data.bedCount = get('c-beds'); data.occupancyRate = get('c-occ'); data.universityPartnership = getRad('c-uni'); data.assetType = get('c-asset'); }
  else if (profile === 'professional') { data.profession = get('d-prof'); data.registrationStatus = get('d-reg'); data.projectScale = get('d-scale'); }
  else if (profile === 'aspiring') { data.developmentInterests = getChk('asp-interest'); data.relevantExperience = get('asp-exp'); }
  return data;
}

/* ══════════════════════════════════════════════
   Mount — wire event listeners for current step
   ══════════════════════════════════════════════ */

function mountCurrentStep(): void {
  const step = getStep();

  // Step-specific mounts
  if (step === 2) mountStepReadiness();
  if (step === 3) mountStepFunding();
  if (step === 5) mountStepConfirm();

  // Restore saved data
  restoreStepData();

  // Wire radio clicks
  document.querySelectorAll<HTMLElement>('.form-step.active .ro').forEach(el => {
    addListener(el, 'click', () => {
      const group = el.parentElement!;
      group.querySelectorAll('.ro').forEach(r => { r.classList.remove('sel'); r.setAttribute('aria-checked', 'false'); });
      el.classList.add('sel');
      el.setAttribute('aria-checked', 'true');
    });
  });

  // Wire checkbox clicks
  document.querySelectorAll<HTMLElement>('.form-step.active .co').forEach(el => {
    addListener(el, 'click', () => {
      el.classList.toggle('sel');
      el.setAttribute('aria-checked', el.classList.contains('sel') ? 'true' : 'false');
    });
  });

  // Textarea counters
  document.querySelectorAll<HTMLTextAreaElement>('.form-step.active .fta').forEach(ta => {
    const countEl = ta.parentElement?.querySelector('.fta-count span');
    if (countEl) {
      addListener(ta, 'input', () => { countEl.textContent = String(ta.value.length); });
    }
  });

  // Navigation buttons
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
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Submitting...';

  const saved = (store.get('formData') ?? {}) as Record<string, unknown>;
  const get = (key: string) => ((saved[`__input_${key}`] as string) ?? '').trim();
  const formData = collectAllFormData();
  formData.engagementSource = sessionStorage.getItem('bm_source') || 'direct';

  const result = await api.submit({
    userType: store.get('selectedProfile')!,
    personal: {
      firstName: get('f-fn'),
      surname: get('f-sn'),
      email: get('f-em').toLowerCase(),
      phone: normalizePhone(get('f-ph')),
      companyName: get('f-co') || undefined,
    },
    formData,
  });

  if (result.success && result.data) {
    store.set('formData', { refNumber: result.data.refNumber });
    store.set('currentStep', 1);
    navigate('/success');
  } else {
    const msg = result.message || 'Submission failed';
    const isNetwork = msg.toLowerCase().includes('network');
    toast(isNetwork
      ? 'No internet connection. Your data is saved — please try again when online.'
      : msg);
    btn.disabled = false;
    btn.textContent = 'Retry Submission →';
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
    const meta = FORM_STEPS[step - 1];
    const isLast = step === TOTAL;
    return `
    <section class="form-view">
      <div class="form-bar">
        <button class="btn-ghost" id="form-back">${step === 1 ? '← Change Profile' : '← Back'}</button>
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
          ${step > 1 ? '<button class="btn-secondary" id="btn-prev">← Previous</button>' : ''}
          ${!isLast ? '<button class="btn-primary" id="btn-next">Continue →</button>' : ''}
          ${isLast ? '<button class="btn-primary" id="btn-submit">Submit Application →</button>' : ''}
        </div>
      </div>
    </section>`;
  },
  mount() {
    cleanupFns = [];
    // Back button (goes to gateway or previous step)
    addListener(document.getElementById('form-back'), 'click', () => {
      if (getStep() === 1) navigate('/gateway');
      else goToStep(getStep() - 1);
    });
    mountCurrentStep();

    // Auto-save every 30 seconds
    const autoSaveInterval = setInterval(() => saveCurrentStepData(), 30000);
    cleanupFns.push(() => clearInterval(autoSaveInterval));
  },
  unmount() {
    saveCurrentStepData();
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];
  },
};
