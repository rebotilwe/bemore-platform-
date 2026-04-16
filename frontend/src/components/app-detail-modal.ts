import type { Application, ApplicationStatus, Classification } from '../types/index.ts';
import { CATEGORY_LABELS } from '../constants/categories.ts';
import { STATUS_LABELS, STATUS_CSS } from '../constants/status.ts';
import { APPLICATION_STATUSES } from '../constants/status.ts';
import { formatDate } from '../utils/format.ts';
import { api } from '../api.ts';
import { toast } from './toast.ts';

function row(key: string, value: string | undefined | null): string {
  if (!value) return '';
  return `<div class="detail-row"><div class="detail-key">${key}</div><div class="detail-val">${value}</div></div>`;
}

function fullRow(key: string, value: string | undefined | null): string {
  if (!value) return '';
  return `<div class="detail-row full"><div class="detail-key">${key}</div><div class="detail-val">${value}</div></div>`;
}

function listRow(key: string, values: string | string[] | undefined): string {
  const arr = Array.isArray(values) ? values : values ? [values] : [];
  if (!arr.length) return '';
  const chips = arr.map(v => `<span class="tag-badge">${v}</span>`).join(' ');
  return `<div class="detail-row"><div class="detail-key">${key}</div><div class="detail-val">${chips}</div></div>`;
}

function sectionLabel(label: string): string {
  return `<div class="detail-section-label">${label}</div>`;
}

function renderProfileFields(type: string, fd: Record<string, unknown>): string {
  let html = '';
  if (type === 'developer') {
    html += sectionLabel('Developer Profile');
    html += row('Years Experience', fd.yearsExperience as string);
    html += listRow('Development Types', fd.developmentTypes as string[]);
  } else if (type === 'landowner') {
    html += sectionLabel('Landowner Profile');
    html += row('Land Size', fd.landSize as string);
    html += row('Zoning Status', fd.zoningStatus as string);
    html += row('Serviced', fd.isServiced as string);
    html += row('Ownership Structure', fd.ownershipStructure as string);
  } else if (type === 'investor') {
    html += sectionLabel('Investor Profile');
    html += listRow('Investment Focus', fd.investmentFocus as string[]);
    html += row('Investment Ticket', fd.investmentTicket as string);
  } else if (type === 'student') {
    html += sectionLabel('Student Accommodation Operator');
    html += row('Bed Count', fd.bedCount as string);
    html += row('Occupancy Rate', fd.occupancyRate as string);
    html += row('University Partnership', fd.universityPartnership as string);
    html += row('Asset Type', fd.assetType as string);
  } else if (type === 'professional') {
    html += sectionLabel('Professional Profile');
    html += row('Profession', fd.profession as string);
    html += row('Registration Status', fd.registrationStatus as string);
    html += row('Project Scale', fd.projectScale as string);
  } else if (type === 'aspiring') {
    html += sectionLabel('Aspiring Developer');
    html += listRow('Development Interests', fd.developmentInterests as string[]);
    html += row('Relevant Experience', fd.relevantExperience as string);
  }
  return html;
}

export function renderAppDetail(app: Application): string {
  const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
  const typeLbl = (CATEGORY_LABELS as Record<string, string>)[app.userType] || app.userType;
  const statusLbl = (STATUS_LABELS as Record<string, string>)[app.status] || app.status;
  const statusCls = (STATUS_CSS as Record<string, string>)[app.status] || '';
  const tags = (app.tags ?? []).map(t => `<span class="tag-badge">${t}</span>`).join(' ');
  const funders = (app.dealRoom?.funders ?? []).map(f => `<span class="tag-badge">${f}</span>`).join(' ');
  const fd = (app.formData as Record<string, unknown>) ?? {};

  // Engagement source
  const sourceTag = app.engagementSource && app.engagementSource !== 'direct'
    ? `<span class="tag-badge tag-source">${app.engagementSource.toUpperCase()}</span>`
    : '';

  // Classification options
  const classificationOptions = ['unclassified', 'hot', 'warm', 'cold'].map(c => {
    const sel = (app.classification || 'unclassified') === c ? ' selected' : '';
    return `<option value="${c}"${sel}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`;
  }).join('');

  // Follow-up
  const followUp = app.followUp ?? { required: false };

  // Status options
  const statusOptions = APPLICATION_STATUSES.map(s => {
    const sel = app.status === s ? ' selected' : '';
    const lbl = (STATUS_LABELS as Record<string, string>)[s] || s;
    return `<option value="${s}"${sel}>${lbl}</option>`;
  }).join('');

  return `
    <div class="modal-card" data-app-id="${app._id}">
      <div class="modal-header">
        <div>
          <div class="modal-title">${name}</div>
          <div class="modal-sub-row">
            <span class="lead-card-ref">${app.refNumber}</span>
            <span class="tag ${statusCls}" id="modal-status-badge">${statusLbl}</span>
            ${sourceTag}
          </div>
        </div>
        <button class="modal-close" id="modal-close-btn" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">

        <!-- ══ ADMIN ACTIONS ══ -->
        <div class="modal-actions">
          <div class="modal-action-row">
            <div class="modal-action-group">
              <label class="modal-action-lbl" for="modal-status">Status</label>
              <select class="modal-action-select" id="modal-status">${statusOptions}</select>
            </div>
            <button class="btn-action" id="modal-save-status">Update Status</button>
          </div>
          <div class="modal-action-row">
            <div class="modal-action-group" style="flex:1">
              <label class="modal-action-lbl" for="modal-notes">Admin Notes</label>
              <textarea class="modal-action-textarea" id="modal-notes" rows="3" placeholder="Add notes about this application...">${app.adminNotes || ''}</textarea>
            </div>
            <button class="btn-action" id="modal-save-notes">Save Notes</button>
          </div>
          <div class="modal-action-row">
            <div class="modal-action-group">
              <label class="modal-action-lbl" for="modal-classification">Classification</label>
              <select class="modal-action-select" id="modal-classification">${classificationOptions}</select>
            </div>
            <button class="btn-action" id="modal-save-classification">Save</button>
          </div>
          <div class="modal-action-row">
            <div class="modal-action-group" style="flex:1">
              <label class="modal-action-lbl">Follow-Up</label>
              <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cream)">
                  <input type="checkbox" id="modal-followup-req" ${followUp.required ? 'checked' : ''} /> Required
                </label>
                <input type="date" id="modal-followup-date" class="modal-action-select" value="${followUp.dueDate ? followUp.dueDate.split('T')[0] : ''}" style="flex:1;min-width:140px" />
              </div>
              <textarea class="modal-action-textarea" id="modal-followup-notes" rows="2" placeholder="Follow-up notes..." style="margin-top:8px">${followUp.notes || ''}</textarea>
            </div>
            <button class="btn-action" id="modal-save-followup">Save</button>
          </div>
        </div>

        ${sectionLabel('Personal Details')}
        <div class="detail-grid">
          ${row('First Name', app.personal?.firstName)}
          ${row('Surname', app.personal?.surname)}
          ${row('Email', app.personal?.email)}
          ${row('Phone', app.personal?.phone)}
          ${row('Company', app.personal?.companyName)}
          ${row('Profile Type', typeLbl)}
        </div>

        ${sectionLabel('Readiness Assessment')}
        <div class="detail-grid">
          ${row('Land Status', fd.landStatus as string)}
          ${row('Project Stage', fd.projectStage as string)}
          ${row('Estimated Value', fd.estimatedValue as string)}
        </div>

        ${sectionLabel('Funding Requirements')}
        <div class="detail-grid">
          ${listRow('Seeking', Array.isArray(fd.seeking) ? fd.seeking as string[] : fd.seeking ? [fd.seeking as string] : undefined)}
          ${row('Previous Funding', fd.previousFunding as string)}
        </div>

        ${renderProfileFields(app.userType, fd)}

        ${sectionLabel('Project Narrative')}
        ${fullRow('Project Description', fd.projectDescription as string)}
        ${fullRow('Why Should BeMore Choose You', fd.whyChooseYou as string)}

        ${sectionLabel('Summit & Consent')}
        <div class="detail-grid">
          ${row('Summit Attendance', fd.summitAttendance as string)}
          ${row('T&Cs Accepted', fd.tcAccepted ? 'Yes' : 'No')}
          ${row('POPIA Consent', fd.popiaConsent ? 'Yes' : 'No')}
        </div>

        ${sectionLabel('Intelligence Tags')}
        ${tags ? `<div class="detail-tags-wrap">${tags}</div>` : '<p class="detail-empty">No tags assigned.</p>'}

        ${sectionLabel('Application Timeline')}
        <div class="detail-grid">
          ${row('Submitted', app.submittedAt ? formatDate(app.submittedAt) : '')}
          ${row('Last Updated', app.updatedAt ? formatDate(app.updatedAt) : 'N/A')}
        </div>

        ${sectionLabel('Deal Room')}
        <div class="detail-grid">
          ${row('Summit Access', app.dealRoom?.summitAccess ? 'Yes — Granted' : 'No')}
          ${row('Deal Room Entry', app.dealRoom?.dealRoomEntry ? 'Yes — Granted' : 'No')}
        </div>
        ${funders ? `<div class="detail-row"><div class="detail-key">Assigned Funders</div><div class="detail-val">${funders}</div></div>` : ''}

      </div>
    </div>`;
}

export function openModal(html: string, app?: Application, onUpdate?: (updated: Application) => void): void {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.innerHTML = html;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');

  const closeBtn = document.getElementById('modal-close-btn');
  const close = () => {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '';
    document.removeEventListener('keydown', escHandler);
  };
  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', escHandler);

  // ── Status change ──
  if (app) {
    document.getElementById('modal-save-status')?.addEventListener('click', async () => {
      const select = document.getElementById('modal-status') as HTMLSelectElement;
      const newStatus = select.value as ApplicationStatus;
      if (newStatus === app.status) return;

      const btn = document.getElementById('modal-save-status') as HTMLButtonElement;
      btn.disabled = true;
      btn.textContent = 'Saving...';

      const res = await api.updateApplication(app._id, { status: newStatus });
      if (res.success && res.data) {
        app.status = newStatus;
        const badge = document.getElementById('modal-status-badge');
        if (badge) {
          badge.textContent = (STATUS_LABELS as Record<string, string>)[newStatus] || newStatus;
          badge.className = `tag ${(STATUS_CSS as Record<string, string>)[newStatus] || ''}`;
        }
        toast(`Status updated to ${(STATUS_LABELS as Record<string, string>)[newStatus]}`);
        if (onUpdate) onUpdate(res.data);
      } else {
        toast('Failed to update status');
      }
      btn.disabled = false;
      btn.textContent = 'Update Status';
    });

    // ── Save classification ──
    document.getElementById('modal-save-classification')?.addEventListener('click', async () => {
      const select = document.getElementById('modal-classification') as HTMLSelectElement;
      const classification = select.value as Classification;
      const btn = document.getElementById('modal-save-classification') as HTMLButtonElement;
      btn.disabled = true;
      btn.textContent = 'Saving...';
      const res = await api.updateApplication(app._id, { classification });
      if (res.success && res.data) {
        app.classification = classification;
        toast(`Classified as ${classification}`);
        if (onUpdate) onUpdate(res.data);
      } else {
        toast('Failed to save classification');
      }
      btn.disabled = false;
      btn.textContent = 'Save';
    });

    // ── Save follow-up ──
    document.getElementById('modal-save-followup')?.addEventListener('click', async () => {
      const reqCheckbox = document.getElementById('modal-followup-req') as HTMLInputElement;
      const dateInput = document.getElementById('modal-followup-date') as HTMLInputElement;
      const notesInput = document.getElementById('modal-followup-notes') as HTMLTextAreaElement;
      const btn = document.getElementById('modal-save-followup') as HTMLButtonElement;
      btn.disabled = true;
      btn.textContent = 'Saving...';
      const followUpData = {
        required: reqCheckbox.checked,
        dueDate: dateInput.value || undefined,
        notes: notesInput.value.trim() || undefined,
      };
      const res = await api.updateApplication(app._id, { followUp: followUpData });
      if (res.success && res.data) {
        app.followUp = res.data.followUp;
        toast('Follow-up saved');
        if (onUpdate) onUpdate(res.data);
      } else {
        toast('Failed to save follow-up');
      }
      btn.disabled = false;
      btn.textContent = 'Save';
    });

    // ── Save admin notes ──
    document.getElementById('modal-save-notes')?.addEventListener('click', async () => {
      const textarea = document.getElementById('modal-notes') as HTMLTextAreaElement;
      const notes = textarea.value.trim();

      const btn = document.getElementById('modal-save-notes') as HTMLButtonElement;
      btn.disabled = true;
      btn.textContent = 'Saving...';

      const res = await api.updateApplication(app._id, { adminNotes: notes });
      if (res.success && res.data) {
        app.adminNotes = notes;
        toast('Notes saved');
        if (onUpdate) onUpdate(res.data);
      } else {
        toast('Failed to save notes');
      }
      btn.disabled = false;
      btn.textContent = 'Save Notes';
    });
  }
}
