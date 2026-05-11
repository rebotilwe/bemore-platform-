/* ---------------------------------------------------------------
   Step 5 — Feedback + Consent (spec §5)
   - Feedback question group rendered via shared <question-group>:
     activityLevel + (notActiveReason if showIf) + feedback. Conditional
     re-render fires when activityLevel changes.
   - Consent block (T&Cs + POPIA) preserved from step-confirm.ts.
   ---------------------------------------------------------------*/

import type { ProfileCategory } from '../../../types/index.ts';
import { store } from '../../../store.ts';
import { renderQuestionGroup } from '../../../components/question-group.ts';
import { PROFILE_CONFIG, visibleQuestions } from '../../../utils/step-readiness.ts';

function patchFormData(profile: ProfileCategory, id: string, value: unknown, host: HTMLElement): void {
  const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
  fd[id] = value;
  store.set('formData', fd);
  if (id === 'activityLevel' || id === 'capitalDeployment') {
    clearStaleHiddenValues(profile);
    rerender(profile, host);
  }
}

function clearStaleHiddenValues(profile: ProfileCategory): void {
  const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
  const all = PROFILE_CONFIG[profile].step5;
  const visible = new Set(visibleQuestions(all, fd).map(q => q.id));
  for (const q of all) {
    if (!visible.has(q.id) && q.id in fd) delete fd[q.id];
  }
  store.set('formData', fd);
}

function rerender(profile: ProfileCategory, host: HTMLElement): void {
  host.innerHTML = '';
  const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
  host.appendChild(
    renderQuestionGroup(
      PROFILE_CONFIG[profile].step5,
      fd,
      (id, value) => patchFormData(profile, id, value, host),
    ),
  );
}

/* ── Consent markup (preserved from previous step-confirm.ts) ── */

function consentMarkup(): string {
  return `
    <div class="fdiv">Terms & Conditions</div>

    <div class="legal-box" tabindex="0" aria-label="Terms and Conditions">
      <h4>BeMore Developer Catalyst Programme</h4>
      <ol>
        <li><strong>Purpose:</strong> The Programme, in partnership with PBSA, is designed to identify, support, and showcase emerging property developers by providing access to mentorship, deal preparation support, and potential exposure to funding institutions. Participation <strong>does not guarantee funding, partnership, or investment</strong>.</li>
        <li><strong>Eligibility:</strong> All information provided must be <strong>true, accurate, and complete</strong>. You must have the authority to submit the project. BeMore reserves the right to disqualify any application found to contain misleading or false information.</li>
        <li><strong>Intellectual Property:</strong> You retain ownership of your project and IP. By participating, you grant BeMore a non-exclusive right to review, discuss, and evaluate the submission.</li>
        <li><strong>No Financial Guarantee:</strong> The Programme does not constitute financial advice, investment solicitation, or a guarantee of funding or deal closure.</li>
        <li><strong>Use of Information:</strong> Your information may be used for programme evaluation, engagement with potential funding partners, and internal analysis.</li>
        <li><strong>Marketing:</strong> Shortlisted participants agree that their name, project name, and general description may be used for marketing purposes.</li>
        <li><strong>Limitation of Liability:</strong> BeMore and its partners shall not be liable for any loss arising from participation, funding decisions by third parties, or business outcomes.</li>
        <li><strong>Governing Law:</strong> These terms are governed by the laws of the Republic of South Africa.</li>
      </ol>
    </div>
    <div class="consent-row" id="consent-tc" role="checkbox" aria-checked="false" aria-label="Accept Terms and Conditions" tabindex="0">
      <span class="consent-check"></span>
      <span class="consent-text"><strong>I have read and agree</strong> to the Terms & Conditions of the BeMore Developer Catalyst Programme.</span>
    </div>

    <div class="fdiv" style="margin-top:var(--sp-8)">POPIA Consent</div>

    <div class="legal-box" tabindex="0" aria-label="POPIA consent notice">
      <h4>Consent to Process Personal Information</h4>
      <p>By submitting this application, I hereby:</p>
      <ul style="padding-left:var(--sp-5);margin-top:var(--sp-3)">
        <li>Consent to BeMore Group and its Programme partners collecting, processing, and storing my personal and project-related information for evaluation, communication, and engagement with funding institutions.</li>
        <li>Understand that my information will be handled in accordance with the <strong>Protection of Personal Information Act (POPIA)</strong>.</li>
        <li>Acknowledge that my personal data will be retained for a maximum of <strong>24 months</strong> from the date of submission, after which it will be securely deleted unless I have entered into an active funding relationship.</li>
        <li>Understand I may <strong>request access to, correction of, or deletion</strong> of my personal information at any time by emailing <strong>info@bts-app.co.za</strong>. Requests will be processed within 30 days.</li>
        <li>Acknowledge that I may <strong>withdraw this consent</strong> at any time by contacting the above address, which may result in my application being removed from the Programme.</li>
      </ul>
    </div>
    <div class="consent-row" id="consent-popia" role="checkbox" aria-checked="false" aria-label="Provide POPIA consent" tabindex="0">
      <span class="consent-check"></span>
      <span class="consent-text"><strong>I consent</strong> to the processing of my personal information as described above.</span>
    </div>`;
}

export function renderStepFeedbackConsent(_profile: ProfileCategory): string {
  return `
    <div class="fdiv">Final Thoughts</div>
    <div id="step5-questions"></div>
    ${consentMarkup()}
  `;
}

export function mountStepFeedbackConsent(profile: ProfileCategory): void {
  clearStaleHiddenValues(profile);
  const host = document.getElementById('step5-questions');
  if (host) rerender(profile, host);

  // Wire consent toggles
  const wire = (id: string) => {
    const row = document.getElementById(id);
    if (!row) return;
    // Restore prior consent state
    const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
    const consent = (fd.consent as { tc?: boolean; popia?: boolean }) ?? {};
    const initial = id === 'consent-tc' ? consent.tc : consent.popia;
    if (initial) {
      row.classList.add('sel');
      row.setAttribute('aria-checked', 'true');
    }
    const toggle = () => {
      const selected = row.classList.toggle('sel');
      row.setAttribute('aria-checked', String(selected));
      const fd2 = (store.get('formData') ?? {}) as Record<string, unknown>;
      const c = (fd2.consent as { tc?: boolean; popia?: boolean }) ?? {};
      if (id === 'consent-tc') c.tc = selected;
      else c.popia = selected;
      fd2.consent = c;
      store.set('formData', fd2);
    };
    row.addEventListener('click', toggle);
    row.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  };
  wire('consent-tc');
  wire('consent-popia');
}
