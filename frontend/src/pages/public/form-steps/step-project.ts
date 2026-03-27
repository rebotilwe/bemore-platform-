/* ---------------------------------------------------------------
   Step 4 — Project Description + Competitive Edge
   ---------------------------------------------------------------*/

export function renderStepProject(): string {
  return `
    <div class="fdiv">Project Details</div>

    <div class="fg">
      <label class="flbl req" for="t-project">Briefly describe your project</label>
      <textarea class="fta" id="t-project" name="projectDescription"
                minlength="50" maxlength="2000" rows="6"
                placeholder="Describe your project — location, size, target market, current status, and what makes it viable. Be as specific as possible."
                aria-required="true" aria-label="Project description"></textarea>
      <div class="fta-count"><span>0</span> / 2,000 characters</div>
    </div>

    <div class="fdiv">Competitive Edge</div>

    <div class="fg">
      <label class="flbl req" for="t-why">Why should BeMore choose you?</label>
      <textarea class="fta" id="t-why" name="whyChooseYou"
                minlength="50" maxlength="2000" rows="6"
                placeholder="What sets you apart? Share your track record, unique advantage, vision, or commitment that makes your project stand out."
                aria-required="true" aria-label="Why should BeMore choose you"></textarea>
      <div class="fta-count"><span>0</span> / 2,000 characters</div>
    </div>`;
}
