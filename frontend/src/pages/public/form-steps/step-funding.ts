/* ---------------------------------------------------------------
   Step 3 — Funding & Partnership
   ---------------------------------------------------------------*/

export function renderStepFunding(): string {
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

export function mountStepFunding(): void {
  /* Radio and checkbox handlers are wired globally in form.ts mount(). */
}
