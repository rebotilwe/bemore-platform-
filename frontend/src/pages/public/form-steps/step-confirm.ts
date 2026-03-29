/* ---------------------------------------------------------------
   Step 5 — Confirmation & Consent
   ---------------------------------------------------------------*/

export function renderStepConfirm(): string {
  return `
    <div class="fdiv">Summit Commitment</div>

    <div class="fg">
      <label class="flbl req">Are you available to attend the summit physically?</label>
      <p style="font-size:var(--fs-label-md);color:var(--on-surface-low);margin-bottom:var(--sp-3);line-height:var(--lh-body)">30–31 March 2026, Sandton. Please note tickets are non-transferable.</p>
      <div class="rg" id="r-attend" role="radiogroup" aria-label="Summit attendance">
        <div class="ro" role="radio" aria-checked="false" tabindex="0"><span class="rdot"></span>Yes</div>
        <div class="ro" role="radio" aria-checked="false" tabindex="0"><span class="rdot"></span>No</div>
      </div>
    </div>

    <div class="fdiv">Terms & Conditions</div>

    <div class="legal-box" tabindex="0" aria-label="Terms and Conditions">
      <h4>BeMore Developer Catalyst Programme</h4>
      <ol>
        <li><strong>Purpose:</strong> The Programme, in partnership with PBSA, is designed to identify, support, and showcase emerging property developers by providing access to mentorship, deal preparation support, and potential exposure to funding institutions. Participation <strong>does not guarantee funding, partnership, or investment</strong>.</li>
        <li><strong>Eligibility:</strong> All information provided must be <strong>true, accurate, and complete</strong>. You must have the authority to submit the project. BeMore reserves the right to disqualify any application found to contain misleading or false information.</li>
        <li><strong>Selection:</strong> Submission does <strong>not guarantee selection</strong>. A panel will shortlist applicants based on viability, impact, and readiness. Decisions are <strong>final and not subject to appeal</strong>.</li>
        <li><strong>Pitch Participation:</strong> Shortlisted applicants may be invited to present their projects to funding institutions and partners (Dragon's Den format).</li>
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

export function mountStepConfirm(): void {
  const wire = (id: string) => {
    const row = document.getElementById(id);
    if (!row) return;
    const toggle = () => {
      const selected = row.classList.toggle('sel');
      row.setAttribute('aria-checked', String(selected));
    };
    row.addEventListener('click', toggle);
    row.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  };
  wire('consent-tc');
  wire('consent-popia');
}
