/* ---------------------------------------------------------------
   Step 2 — Development Readiness + Category-Specific Fields
   ---------------------------------------------------------------*/

import type { ProfileCategory } from '../../../types/index.ts';

/* ── Helpers ── */

function sel(id: string, label: string, opts: string[], required = true): string {
  return `
    <div class="fg">
      <label class="flbl${required ? ' req' : ''}" for="${id}">${label}</label>
      <div class="sw">
        <select class="fs" id="${id}" aria-required="${required}" aria-label="${label}">
          <option value="">Select…</option>
          ${opts.map(o => `<option value="${o}">${o}</option>`).join('')}
        </select>
      </div>
    </div>`;
}

function radio(id: string, label: string, opts: string[], required = true): string {
  return `
    <div class="fg">
      <label class="flbl${required ? ' req' : ''}">${label}</label>
      <div class="rg" id="${id}" role="radiogroup" aria-label="${label}">
        ${opts.map(o => `
          <div class="ro" role="radio" aria-checked="false" tabindex="0">
            <span class="rdot"></span>${o}
          </div>`).join('')}
      </div>
    </div>`;
}

function checks(id: string, label: string, opts: string[], required = true): string {
  return `
    <div class="fg">
      <label class="flbl${required ? ' req' : ''}">${label}</label>
      <div class="cg" id="${id}" role="group" aria-label="${label}">
        ${opts.map(o => `
          <div class="co" role="checkbox" aria-checked="false" tabindex="0">
            <span class="cbox"></span>${o}
          </div>`).join('')}
      </div>
    </div>`;
}

/* ── Category-specific blocks ── */

function developerFields(): string {
  return `
    <div class="fdiv">Development Profile</div>
    <div class="frow">
      ${sel('a-exp', 'Years of Experience', ['0–2 years', '3–5 years', '6–10 years', '10+ years'])}
    </div>
    ${checks('a-dtype', 'Development Type(s)', ['Residential', 'Commercial', 'Student Housing', 'Mixed-Use'])}`;
}

function landownerFields(): string {
  return `
    <div class="fdiv">Land Profile</div>
    <div class="frow">
      ${sel('b-size', 'Land Size', ['Less than 1,000 sqm', '1,000 – 5,000 sqm', '5,000 – 10,000 sqm', 'Greater than 10,000 sqm'])}
      ${sel('b-zone', 'Zoning Status', ['Residential', 'Commercial', 'Mixed-Use', 'Unzoned', 'Awaiting Rezoning'])}
    </div>
    <div class="frow">
      ${radio('b-serv', 'Is Land Serviced?', ['Yes (Water / Electricity / Sewage)', 'No', 'Partially'])}
      ${sel('b-own', 'Ownership Structure', ['Sole Owner', 'Partnership', 'Trust', 'Company'])}
    </div>
    <div class="fdiv">Development Appetite</div>
    ${radio('b-appetite', 'What would you like to do with your land?', [
      'Develop it myself',
      'Partner with a developer (Joint Venture)',
      'Sell to a developer',
      'Open to all options',
    ])}
    <div class="frow">
      ${sel('b-timeline', 'Timeline / Urgency', [
        'Immediate — within 3 months',
        'Short-term — 3 to 12 months',
        'Long-term — 1 to 3 years',
        'Exploratory — no firm timeline',
      ])}
      ${radio('b-bond', 'Does the land have an existing bond or mortgage?', ['Yes', 'No'])}
    </div>`;
}

function investorFields(): string {
  return `
    <div class="fdiv">Investment Profile</div>
    ${checks('inv-focus', 'Sectors of Interest', ['Student Accommodation', 'Residential', 'Commercial', 'Mixed-Use', 'Healthcare / Social Infrastructure'])}
    <div class="frow">
      ${sel('inv-amount', 'Amount Willing to Invest (R)', ['Less than R5m', 'R5m – R20m', 'R20m – R100m', 'R100m+'])}
      ${sel('inv-horizon', 'Investment Horizon', ['Less than 1 year', '1 – 3 years', '3 – 5 years', '5+ years'])}
    </div>
    ${checks('inv-return', 'Preferred Return Structure', ['Equity Stake', 'Profit Share', 'Interest-Bearing Loan', 'Combination of the above'])}
    ${radio('inv-prev', 'Do you have prior property investment experience?', ['Yes', 'No'])}`;
}

function studentFields(): string {
  return `
    <div class="fdiv">Accommodation Profile</div>
    <div class="frow">
      ${sel('c-beds', 'Current Bed Count', ['Less than 50 beds', '50 – 200 beds', '200 – 500 beds', '500+ beds'])}
      ${sel('c-occ', 'Occupancy Rate', ['Less than 60%', '60% – 80%', '80% – 95%', '95%+'])}
    </div>
    <div class="frow">
      ${radio('c-uni', 'University Partnership', ['Yes (Formal Agreement)', 'No'])}
      ${sel('c-asset', 'Asset Type', ['Converted Residential', 'Purpose-Built', 'Pending Acquisition'])}
    </div>`;
}

function professionalFields(): string {
  return `
    <div class="fdiv">Professional Profile</div>
    <div class="frow">
      ${sel('d-prof', 'Profession', ['Architect', 'Civil Engineer', 'Quantity Surveyor', 'Project Manager', 'Other'])}
      ${sel('d-reg', 'Registration Status', ['SACAP Registered', 'ECSA Registered', 'Unregistered'])}
    </div>
    ${sel('d-scale', 'Project Scale Handled', ['Less than R5m', 'R5m – R20m', 'Greater than R20m'])}`;
}

function aspiringFields(): string {
  return `
    <div class="fdiv">Aspiring Developer Profile</div>
    ${checks('asp-interest', 'Development Interest Areas', ['Student Accommodation', 'Residential Housing', 'Commercial Property', 'Mixed-Use Development'])}
    <div class="fg">
      <label class="flbl" for="asp-exp">Relevant Experience or Qualifications</label>
      <input class="fi" id="asp-exp" type="text"
             placeholder="e.g. Civil Engineering degree, property management experience"
             aria-required="false" aria-label="Relevant experience" />
    </div>`;
}

const categoryBlocks: Record<ProfileCategory, () => string> = {
  developer: developerFields, landowner: landownerFields,
  investor: investorFields, student: studentFields,
  professional: professionalFields, aspiring: aspiringFields,
};

/* profiles that skip the generic land / stage / value block */
const SKIP_GENERIC = new Set<ProfileCategory>(['investor']);

/* ── Main render ── */

export function renderStepReadiness(profile: ProfileCategory): string {
  const extra = categoryBlocks[profile]?.() ?? '';

  if (SKIP_GENERIC.has(profile)) {
    return extra;
  }

  return `
    <div class="fdiv">Development Readiness</div>

    ${radio('r-land', 'Do you currently have land?', ['Land Secured', 'Land under negotiation', 'No land yet'])}

    <div class="frow">
      ${sel('s-stage', 'What stage is your project?', ['Concept', 'Feasibility completed', 'Design Stage', 'Funding Stage', 'Construction Stage'])}
      ${sel('s-value', 'Estimated Project Value (R)', ['Less than R5m', 'R5m – R20m', 'R20m – R100m', 'R100m+'])}
    </div>

    ${extra}`;
}

export function mountStepReadiness(): void {
  /* Radio and checkbox handlers are wired globally in form.ts mount(). */
}
