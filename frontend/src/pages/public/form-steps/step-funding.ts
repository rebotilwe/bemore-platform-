/* ---------------------------------------------------------------
   Step 3 — Funding & Partnership (profile-aware)
   ---------------------------------------------------------------*/

import type { ProfileCategory } from '../../../types/index.ts';

function renderDefault(): string {
  return `
    <div class="fdiv">Funding & Partnership Intention</div>

    <div class="fg">
      <label class="flbl req">What are you seeking? <span class="flbl-hint">(select all that apply)</span></label>
      <div class="cg" id="c-seeking" role="group" aria-label="What are you seeking?">
        <div class="co" role="checkbox" aria-checked="false" tabindex="0"><span class="cbox"></span>Equity Partner</div>
        <div class="co" role="checkbox" aria-checked="false" tabindex="0"><span class="cbox"></span>Debt Funding</div>
        <div class="co" role="checkbox" aria-checked="false" tabindex="0"><span class="cbox"></span>Joint Venture Partner</div>
        <div class="co" role="checkbox" aria-checked="false" tabindex="0"><span class="cbox"></span>Advisory Support</div>
      </div>
    </div>

    <div class="fg">
      <label class="flbl req">Have you previously raised funding?</label>
      <div class="rg" id="r-prevfund" role="radiogroup" aria-label="Have you previously raised funding?">
        <div class="ro" role="radio" aria-checked="false" tabindex="0"><span class="rdot"></span>Yes (Institutional)</div>
        <div class="ro" role="radio" aria-checked="false" tabindex="0"><span class="rdot"></span>Yes (Private)</div>
        <div class="ro" role="radio" aria-checked="false" tabindex="0"><span class="rdot"></span>No</div>
      </div>
    </div>`;
}

function renderLandowner(): string {
  return `
    <div class="fdiv">Partnership Preferences</div>

    <div class="fg">
      <label class="flbl req">What outcome are you seeking? <span class="flbl-hint">(select all that apply)</span></label>
      <div class="cg" id="c-seeking" role="group" aria-label="What outcome are you seeking?">
        <div class="co" role="checkbox" aria-checked="false" tabindex="0"><span class="cbox"></span>Equity stake in the development</div>
        <div class="co" role="checkbox" aria-checked="false" tabindex="0"><span class="cbox"></span>Upfront sale proceeds</div>
        <div class="co" role="checkbox" aria-checked="false" tabindex="0"><span class="cbox"></span>Monthly rental income</div>
        <div class="co" role="checkbox" aria-checked="false" tabindex="0"><span class="cbox"></span>Combination of the above</div>
      </div>
    </div>

    <div class="fg">
      <label class="flbl req">Have you had the land valued recently?</label>
      <div class="rg" id="r-prevfund" role="radiogroup" aria-label="Have you had the land valued recently?">
        <div class="ro" role="radio" aria-checked="false" tabindex="0"><span class="rdot"></span>Yes — within the last 12 months</div>
        <div class="ro" role="radio" aria-checked="false" tabindex="0"><span class="rdot"></span>No — not recently valued</div>
      </div>
    </div>`;
}

function renderInvestor(): string {
  return `
    <div class="fdiv">Investment Intentions</div>

    <div class="fg">
      <label class="flbl req">What are you looking for? <span class="flbl-hint">(select all that apply)</span></label>
      <div class="cg" id="c-seeking" role="group" aria-label="What are you looking for?">
        <div class="co" role="checkbox" aria-checked="false" tabindex="0"><span class="cbox"></span>Co-Investment Opportunity</div>
        <div class="co" role="checkbox" aria-checked="false" tabindex="0"><span class="cbox"></span>Deal Flow Access</div>
        <div class="co" role="checkbox" aria-checked="false" tabindex="0"><span class="cbox"></span>Fund Placement</div>
        <div class="co" role="checkbox" aria-checked="false" tabindex="0"><span class="cbox"></span>Institutional Joint Venture</div>
      </div>
    </div>

    <div class="fg">
      <label class="flbl req">What is your decision-making timeline?</label>
      <div class="sw">
        <select class="fs" id="inv-timeline" aria-required="true" aria-label="Decision-making timeline">
          <option value="">Select…</option>
          <option>Immediate — ready to deploy capital now</option>
          <option>Within 3 months</option>
          <option>3 – 6 months</option>
          <option>Exploratory only — no firm timeline</option>
        </select>
      </div>
    </div>`;
}

export function renderStepFunding(profile?: ProfileCategory): string {
  if (profile === 'investor') return renderInvestor();
  if (profile === 'landowner') return renderLandowner();
  return renderDefault();
}

export function mountStepFunding(): void {
  /* Radio and checkbox handlers are wired globally in form.ts mount(). */
}
