/* ---------------------------------------------------------------
   Step 4 — Project Description (profile-aware)
   ---------------------------------------------------------------*/

import type { ProfileCategory } from '../../../types/index.ts';

export function renderStepProject(profile?: ProfileCategory): string {
  if (profile === 'investor') {
    return `
    <div class="fdiv">Additional Notes</div>

    <div class="fg">
      <label class="flbl" for="t-project">Anything else you'd like us to know? <span class="flbl-hint">(optional)</span></label>
      <textarea class="fta" id="t-project" name="projectDescription"
                maxlength="1000" rows="5"
                placeholder="Share any context about your investment mandate, target regions, or specific sectors of interest."
                aria-required="false" aria-label="Additional notes"></textarea>
      <div class="fta-count"><span>0</span> / 1,000 characters</div>
    </div>`;
  }

  if (profile === 'professional') {
    return `
    <div class="fdiv">Additional Information</div>

    <div class="fg">
      <label class="flbl" for="t-project">Anything else you'd like us to know? <span class="flbl-hint">(optional)</span></label>
      <textarea class="fta" id="t-project" name="projectDescription"
                maxlength="1000" rows="5"
                placeholder="Share any additional context about your work, notable projects, or what you're looking for."
                aria-required="false" aria-label="Additional information"></textarea>
      <div class="fta-count"><span>0</span> / 1,000 characters</div>
    </div>`;
  }

  if (profile === 'student') {
    return `
    <div class="fdiv">Tell Us About Your Portfolio</div>

    <div class="fg">
      <label class="flbl req" for="t-project">Describe your student accommodation portfolio</label>
      <textarea class="fta" id="t-project" name="projectDescription"
                minlength="50" maxlength="2000" rows="6"
                placeholder="Describe your properties — locations, number of units/beds, current state of accreditation, target student market, and any expansion plans."
                aria-required="true" aria-label="Portfolio description"></textarea>
      <div class="fta-count"><span>0</span> / 2,000 characters</div>
    </div>`;
  }

  return `
    <div class="fdiv">Project Details</div>

    <div class="fg">
      <label class="flbl req" for="t-project">Briefly describe your project</label>
      <textarea class="fta" id="t-project" name="projectDescription"
                minlength="50" maxlength="2000" rows="6"
                placeholder="Describe your project — location, size, target market, current status, and what makes it viable. Be as specific as possible."
                aria-required="true" aria-label="Project description"></textarea>
      <div class="fta-count"><span>0</span> / 2,000 characters</div>
    </div>`;
}
