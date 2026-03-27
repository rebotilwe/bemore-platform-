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
      ${sel('b-size', 'Land Size', ['Less than 1,000 sqm', '1,000 – 5,000 sqm', 'Greater than 5,000 sqm'])}
      ${sel('b-zone', 'Zoning Status', ['Residential', 'Commercial', 'Mixed-Use', 'Unzoned', 'Awaiting Rezoning'])}
    </div>
    <div class="frow">
      ${radio('b-serv', 'Is Land Serviced?', ['Yes (Water/Elec/Sewage)', 'No'])}
      ${sel('b-own', 'Ownership Structure', ['Sole Owner', 'Partnership', 'Trust', 'Company'])}
    </div>`;
}

function investorFields(): string {
  return `
    <div class="fdiv">Investment Profile</div>
    ${checks('inv-focus', 'Investment Focus', ['Student Accommodation', 'Residential', 'Commercial', 'Mixed-Use'])}
    <div class="frow">
      ${sel('inv-ticket', 'Investment Ticket Size', ['Less than R5m', 'R5m – R20m', 'R20m – R100m', 'R100m+'])}
    </div>`;
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

/* ── Main render ── */

export function renderStepReadiness(profile: ProfileCategory): string {
  const extra = categoryBlocks[profile]?.() ?? '';
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
