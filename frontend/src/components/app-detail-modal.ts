import type { Application, ApplicationStatus, Classification, ProfileCategory } from '../types/index.ts';
import { CATEGORY_LABELS } from '../constants/categories.ts';
import { STATUS_LABELS, STATUS_CSS } from '../constants/status.ts';
import { APPLICATION_STATUSES } from '../constants/status.ts';
import { LEGACY_TAGS, TAG_LABELS } from '../constants/tags.ts';
import { getFieldLabel } from '../constants/profile-field-labels.ts';
import { formatDate, esc } from '../utils/format.ts';
import { api } from '../api.ts';
import { toast } from './toast.ts';

// ── Profile question configs (FE-2). Used here to derive section
// membership for the lead detail formData renderer.
import developerQuestions from '../constants/profiles/developer.questions.ts';
import landownerQuestions from '../constants/profiles/landowner.questions.ts';
import investorQuestions from '../constants/profiles/investor.questions.ts';
import studentQuestions from '../constants/profiles/student.questions.ts';
import professionalQuestions from '../constants/profiles/professional.questions.ts';
import aspiringQuestions from '../constants/profiles/aspiring.questions.ts';
import type { ProfileQuestions } from '../types/question.ts';

const PROFILE_CONFIGS: Record<ProfileCategory, ProfileQuestions> = {
  developer: developerQuestions,
  landowner: landownerQuestions,
  investor: investorQuestions,
  student: studentQuestions,
  professional: professionalQuestions,
  aspiring: aspiringQuestions,
};

const SECTION_TITLES = {
  position: 'Position & Activity',
  constraints: 'Constraints & Alignment',
  feedback: 'Feedback',
  legacy: 'Additional Information',
} as const;

/** Activity tag → palette token. spec §6.6. */
const ACTIVITY_BADGE_VARIANT: Record<string, { label: string; cls: string }> = {
  ACTIVELY_LOOKING: { label: 'Actively Looking', cls: 'activity-badge activity-gold' },
  OPEN_TO_OPPORTUNITY: { label: 'Open to Opportunity', cls: 'activity-badge activity-neutral' },
  LOW_INTENT: { label: 'Low Intent', cls: 'activity-badge activity-grey' },
};

function fmtValue(v: unknown): string {
  if (v == null || v === '') return '';
  if (Array.isArray(v)) return v.filter((x) => x != null && x !== '').map((x) => String(x)).join(' · ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

function detailRow(label: string, value: unknown): string {
  const text = fmtValue(value);
  if (!text) return '';
  return `<div class="detail-row"><div class="detail-key">${esc(label)}</div><div class="detail-val">${esc(text)}</div></div>`;
}

function sectionLabel(label: string): string {
  return `<div class="detail-section-label">${esc(label)}</div>`;
}

/**
 * Build the section → field-id mapping for a profile from its question
 * config. Step 2 → Position & Activity, Step 3 → Constraints & Alignment,
 * Step 5 → Feedback. Step 4 (contact) is part of `personal`, not formData.
 * Step 1 fields (if any in formData) are also surfaced under Position.
 */
function getSectionKeys(profile: ProfileCategory): {
  position: string[];
  constraints: string[];
  feedback: string[];
  known: Set<string>;
} {
  const cfg = PROFILE_CONFIGS[profile];
  const collect = (qs: { id: string }[]): string[] => qs.map((q) => q.id);
  const position = [...collect(cfg.step1 ?? []), ...collect(cfg.step2 ?? [])];
  const constraints = collect(cfg.step3 ?? []);
  // Feedback section: universal step-5 keys, but skip the `cv` file id which
  // is rendered separately via the attachments block.
  const feedback = collect(cfg.step5 ?? []).filter((id) => id !== 'cv');
  const known = new Set<string>([...position, ...constraints, ...feedback, 'cv']);
  return { position, constraints, feedback, known };
}

function renderSection(
  title: string,
  keys: string[],
  fd: Record<string, unknown>,
  profile: ProfileCategory,
): string {
  const rows = keys
    .map((k) => detailRow(getFieldLabel(profile, k), fd[k]))
    .filter(Boolean)
    .join('');
  if (!rows) return '';
  return `${sectionLabel(title)}<div class="detail-grid">${rows}</div>`;
}

/** Render any keys that aren't part of the profile's known schema. */
function renderLegacyExtras(
  fd: Record<string, unknown>,
  known: Set<string>,
  profile: ProfileCategory,
): string {
  const SKIP_KEYS = new Set(['tcAccepted', 'popiaConsent']);
  const rows = Object.keys(fd)
    .filter((k) => !known.has(k) && !SKIP_KEYS.has(k))
    .map((k) => detailRow(getFieldLabel(profile, k), fd[k]))
    .filter(Boolean)
    .join('');
  if (!rows) return '';
  return `${sectionLabel(SECTION_TITLES.legacy)}<div class="detail-grid">${rows}</div>`;
}

function renderActivityBadge(tags: readonly string[]): string {
  for (const t of tags) {
    const variant = ACTIVITY_BADGE_VARIANT[t];
    if (variant) {
      return `<div class="${variant.cls}" data-activity-tag="${esc(t)}">${esc(variant.label)}</div>`;
    }
  }
  return '';
}

const COMPLIANCE_DOC_LABELS: Record<string, string> = {
  company_registration: 'Company Registration Certificate',
  tax_clearance: 'Tax Clearance Certificate',
  bee_certificate: 'BEE Certificate / Affidavit',
  professional_indemnity: 'Professional Indemnity Insurance',
};
const COMPLIANCE_DOC_ORDER = ['company_registration', 'tax_clearance', 'bee_certificate', 'professional_indemnity'];

function docExpiryStatus(expiryDate?: string): { label: string; cls: string } {
  if (!expiryDate) return { label: 'No expiry set', cls: 'doc-status-unknown' };
  const now = Date.now();
  const exp = new Date(expiryDate).getTime();
  const daysLeft = Math.floor((exp - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: 'Expired', cls: 'doc-status-expired' };
  if (daysLeft <= 30) return { label: `Expiring — ${daysLeft}d left`, cls: 'doc-status-expiring' };
  return { label: 'Valid', cls: 'doc-status-valid' };
}

function renderAttachments(app: Application): string {
  const atts = app.attachments ?? [];
  if (app.userType !== 'professional' || !atts.length) return '';
  const items = atts
    .filter((a) => a && a.field === 'cv' && a.storedAs)
    .map((a) => {
      const sizeKb = a.size ? ` · ${(a.size / 1024).toFixed(0)} KB` : '';
      return `
        <div class="attachment-row">
          <div class="attachment-meta">
            <span class="attachment-filename">${esc(a.filename)}</span>
            <span class="attachment-size">${esc(sizeKb.replace(/^ · /, ''))}</span>
          </div>
          <button class="btn-action attachment-download"
                  data-ref="${esc(app.refNumber)}"
                  data-stored="${esc(a.storedAs)}"
                  data-filename="${esc(a.filename)}">
            Download CV
          </button>
        </div>`;
    })
    .join('');
  if (!items) return '';
  return `${sectionLabel('Attachments')}<div class="detail-attachments">${items}</div>`;
}

/** Compliance documents — Company Registration, Tax Clearance, BEE Certificate,
 *  Professional Indemnity — with expiry status and admin verify/reject controls.
 *  Built Environment Professionals only. */
function renderComplianceDocuments(app: Application): string {
  if (app.userType !== 'professional') return '';
  const atts = app.attachments ?? [];

  const rows = COMPLIANCE_DOC_ORDER.map((field) => {
    const a = atts.find((x) => x && x.field === field);
    const label = COMPLIANCE_DOC_LABELS[field];

    if (!a || !a.storedAs) {
      return `
        <div class="compliance-doc-row compliance-doc-missing">
          <div class="compliance-doc-meta">
            <span class="compliance-doc-label">${esc(label)}</span>
            <span class="doc-status doc-status-unknown">Not submitted</span>
          </div>
        </div>`;
    }

    const status = docExpiryStatus(a.expiryDate);
    const sizeKb = a.size ? `${(a.size / 1024).toFixed(0)} KB` : '';
    const expiryTxt = a.expiryDate ? `Expires ${formatDate(a.expiryDate)}` : '';

    let verifyBadge = '';
    if (a.isVerified === true) {
      verifyBadge = `<span class="doc-verify-badge doc-verified">✅ Verified${a.verifiedAt ? ` — ${formatDate(a.verifiedAt)}` : ''}</span>`;
    } else if (a.isVerified === false && a.rejectionReason) {
      verifyBadge = `<span class="doc-verify-badge doc-rejected">❌ Rejected — ${esc(a.rejectionReason)}</span>`;
    } else {
      verifyBadge = `<span class="doc-verify-badge doc-pending">⏳ Pending review</span>`;
    }

    return `
      <div class="compliance-doc-row" data-field="${esc(field)}" data-stored="${esc(a.storedAs)}">
        <div class="compliance-doc-meta">
          <span class="compliance-doc-label">${esc(label)}</span>
          <span class="attachment-filename">${esc(a.filename)}</span>
          <span class="attachment-size">${esc(sizeKb)}${expiryTxt ? ` · ${esc(expiryTxt)}` : ''}</span>
          <span class="doc-status ${status.cls}">${esc(status.label)}</span>
          ${verifyBadge}
        </div>
        <div class="compliance-doc-actions">
          <button class="btn-action btn-action-sm attachment-download"
                  data-ref="${esc(app.refNumber)}"
                  data-stored="${esc(a.storedAs)}"
                  data-filename="${esc(a.filename)}">
            Download
          </button>
          <button class="btn-action btn-action-sm doc-verify-btn" data-field="${esc(field)}" data-stored="${esc(a.storedAs)}">Verify</button>
          <button class="btn-action btn-action-sm btn-danger-ghost doc-reject-btn" data-field="${esc(field)}" data-stored="${esc(a.storedAs)}">Reject</button>
        </div>
      </div>`;
  }).join('');

  return `<div id="compliance-doc-section">${sectionLabel('Compliance Documents')}<div class="compliance-doc-list">${rows}</div></div>`;
}

function renderWorkloadSection(app: Application): string {
  const workload = (app as Application & { workload?: { activeProjects?: number; maxProjects?: number } }).workload;
  const active = workload?.activeProjects || 0;
  const max = workload?.maxProjects || 5;
  const atCapacity = active >= max;
  const allocated = (app as Application & { allocatedProjects?: string[] }).allocatedProjects ?? [];
  const isOnboarded = ['invited', 'funded'].includes(app.status);

  const capacityCls = atCapacity ? 'workload-badge workload-full' : 'workload-badge workload-available';
  const capacityBadge = `<span class="${capacityCls}">${active} / ${max} projects</span>`;

  const notOnboardedNote = !isOnboarded
    ? `<p class="detail-empty">Professional must be Onboarded before projects can be assigned.</p>`
    : '';

  const projectRows = allocated.length
    ? allocated.map((p) => `
        <div class="workload-project-row" data-project-id="${esc(p)}">
          <span class="tag-badge">${esc(p)}</span>
          <button class="btn-action btn-action-sm workload-complete-btn" data-project-id="${esc(p)}">Mark Complete</button>
        </div>`).join('')
    : '<p class="detail-empty">No projects allocated yet.</p>';

  const assignRow = isOnboarded && !atCapacity
    ? `<div class="modal-action-row">
        <div class="modal-action-group" style="flex:1">
          <label class="modal-action-lbl" for="workload-project-input">Assign New Project</label>
          <input type="text" class="modal-action-select" id="workload-project-input" placeholder="Project ID or name" />
        </div>
        <button class="btn-action" id="workload-assign-btn">Assign Project</button>
      </div>`
    : atCapacity ? '<p class="detail-empty">At capacity — complete a project before assigning another.</p>' : '';

  return `
    <div id="workload-section">
      ${sectionLabel('Project Allocation')}
      <div class="workload-summary-row">${capacityBadge}</div>
      ${notOnboardedNote}
      <div class="workload-project-list">${projectRows}</div>
      ${assignRow}
    </div>`;
}

export function renderAppDetail(app: Application): string {
  const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
  const typeLbl = (CATEGORY_LABELS as Record<string, string>)[app.userType] || app.userType;
  const statusLbl = (STATUS_LABELS as Record<string, string>)[app.status] || app.status;
  const statusCls = (STATUS_CSS as Record<string, string>)[app.status] || '';

  // Tag chips — strip legacy tags first (spec §9.5). Never mutate the source array.
  const visibleTagList = (app.tags ?? []).filter((t) => !LEGACY_TAGS.has(t));
  const tags = visibleTagList
    .map((t) => `<span class="tag-badge">${esc(TAG_LABELS[t] ?? t)}</span>`)
    .join(' ');
  const funders = (app.dealRoom?.funders ?? [])
    .map((f) => `<span class="tag-badge">${esc(f)}</span>`)
    .join(' ');

  const fd = (app.formData as Record<string, unknown>) ?? {};
  const profile = app.userType as ProfileCategory;
  const sections = getSectionKeys(profile);

  // Engagement source
  const sourceTag = app.engagementSource && app.engagementSource !== 'direct'
    ? `<span class="tag-badge tag-source">${esc(app.engagementSource.toUpperCase())}</span>`
    : '';

  // Activity badge — only the first matching activity tag drives the badge.
  const activityBadgeHtml = renderActivityBadge(visibleTagList);

  // Classification options
  const classificationOptions = ['unclassified', 'hot', 'warm', 'cold'].map((c) => {
    const sel = (app.classification || 'unclassified') === c ? ' selected' : '';
    return `<option value="${c}"${sel}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`;
  }).join('');

  // Follow-up
  const followUp = app.followUp ?? { required: false };

  // Status options
  const statusOptions = APPLICATION_STATUSES.map((s) => {
    const sel = app.status === s ? ' selected' : '';
    const lbl = (STATUS_LABELS as Record<string, string>)[s] || s;
    return `<option value="${s}"${sel}>${lbl}</option>`;
  }).join('');

  // Section HTML
  const positionHtml = renderSection(SECTION_TITLES.position, sections.position, fd, profile);
  const constraintsHtml = renderSection(SECTION_TITLES.constraints, sections.constraints, fd, profile);
  const feedbackHtml = renderSection(SECTION_TITLES.feedback, sections.feedback, fd, profile);
  const legacyHtml = renderLegacyExtras(fd, sections.known, profile);

  const formDataEmpty = !positionHtml && !constraintsHtml && !feedbackHtml && !legacyHtml;
  const emptyStateHtml = formDataEmpty
    ? '<p class="detail-empty">No additional information captured.</p>'
    : '';

  return `
    <div class="modal-card" data-app-id="${app._id}">
      <div class="modal-header">
        <div>
          <div class="modal-title">${esc(name)}</div>
          <div class="modal-sub-row">
            <span class="lead-card-ref">${esc(app.refNumber)}</span>
            <span class="tag ${statusCls}" id="modal-status-badge">${statusLbl}</span>
            ${sourceTag}
          </div>
          ${activityBadgeHtml}
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
              <textarea class="modal-action-textarea" id="modal-notes" rows="3" placeholder="Add notes about this application...">${esc(app.adminNotes)}</textarea>
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
              <textarea class="modal-action-textarea" id="modal-followup-notes" rows="2" placeholder="Follow-up notes..." style="margin-top:8px">${esc(followUp.notes)}</textarea>
            </div>
            <button class="btn-action" id="modal-save-followup">Save</button>
          </div>
        </div>

        ${sectionLabel('Personal Details')}
        <div class="detail-grid">
          ${detailRow('First Name', app.personal?.firstName)}
          ${detailRow('Surname', app.personal?.surname)}
          ${detailRow('Email', app.personal?.email)}
          ${detailRow('Phone', app.personal?.phone)}
          ${detailRow('Company', app.personal?.companyName)}
          ${detailRow('Profile Type', typeLbl)}
        </div>

        ${positionHtml}
        ${constraintsHtml}
        ${feedbackHtml}
        ${legacyHtml}
        ${emptyStateHtml}

        ${renderAttachments(app)}

        ${renderComplianceDocuments(app)}

        ${app.userType === 'professional' ? renderWorkloadSection(app) : ''}

        ${sectionLabel('Consent')}
        ${(() => {
          // Read from the persisted consent block (POPIA audit trail). Falls
          // back to the legacy `fd.tcAccepted` / `fd.popiaConsent` keys for
          // applications submitted before consent was persisted on the
          // Application document (2026-05-11).
          const consent = (app as Application & { consent?: { tc?: boolean; popia?: boolean; capturedAt?: string } }).consent;
          const tcOk = consent ? consent.tc === true : Boolean(fd.tcAccepted);
          const popiaOk = consent ? consent.popia === true : Boolean(fd.popiaConsent);
          const capturedAt = consent?.capturedAt ? formatDate(consent.capturedAt) : null;
          return `<div class="detail-grid">
            ${detailRow('T&Cs Accepted', tcOk ? 'Yes' : 'No')}
            ${detailRow('POPIA Consent', popiaOk ? 'Yes' : 'No')}
            ${capturedAt ? detailRow('Consent Captured', capturedAt) : ''}
          </div>`;
        })()}

        ${sectionLabel('Intelligence Tags')}
        ${tags ? `<div class="detail-tags-wrap">${tags}</div>` : '<p class="detail-empty">No tags assigned.</p>'}

        ${sectionLabel('Application Timeline')}
        <div class="detail-grid">
          ${detailRow('Submitted', app.submittedAt ? formatDate(app.submittedAt) : '')}
          ${detailRow('Last Updated', app.updatedAt ? formatDate(app.updatedAt) : 'N/A')}
        </div>

        ${sectionLabel('Deal Room')}
        <div class="detail-grid">
          ${detailRow('Deal Room Entry', app.dealRoom?.dealRoomEntry ? 'Yes — Granted' : 'No')}
        </div>
        ${funders ? `<div class="detail-row"><div class="detail-key">Assigned Funders</div><div class="detail-val">${funders}</div></div>` : ''}

      </div>
    </div>`;
}

/**
 * Triggers a CV download via authenticated fetch — avoids the limitations
 * of `<a download>` (which can't carry the Bearer token through Vercel
 * proxy rewrites). Uses a Blob URL so the browser saves the file natively.
 */
async function downloadAttachment(refNumber: string, storedAs: string, filename: string): Promise<void> {
  const token = sessionStorage.getItem('bm_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(
      `/api/applications/${encodeURIComponent(refNumber)}/attachment/${encodeURIComponent(storedAs)}`,
      { headers, credentials: 'include' },
    );
    if (!res.ok) {
      toast(`Failed to download CV (${res.status})`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'cv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    toast('Network error — could not download CV');
  }
}

function wireAttachmentDownloadButtons(root: ParentNode): void {
  root.querySelectorAll<HTMLButtonElement>('.attachment-download').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ref = btn.dataset.ref || '';
      const stored = btn.dataset.stored || '';
      const filename = btn.dataset.filename || 'cv';
      if (!ref || !stored) return;
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = 'Downloading...';
      await downloadAttachment(ref, stored, filename);
      btn.disabled = false;
      btn.textContent = original;
    });
  });
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

  // ── Attachment downloads ──
  wireAttachmentDownloadButtons(overlay);

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
        refreshWorkloadSection(res.data);
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

    // ── Project allocation (Built Environment Professionals only) ──
    if (app.userType === 'professional') {
      wireWorkloadHandlers(app, onUpdate);
      wireComplianceDocHandlers(app, onUpdate);
    }
  }
}

/** Re-renders just the Project Allocation section in place after a status/allocation change. */
function refreshWorkloadSection(app: Application, onUpdate?: (updated: Application) => void): void {
  if (app.userType !== 'professional') return;
  const section = document.getElementById('workload-section');
  if (!section) return;
  section.outerHTML = renderWorkloadSection(app);
  wireWorkloadHandlers(app, onUpdate);
}

/** Wires the Assign Project / Mark Complete buttons for the Project Allocation section. */
function wireWorkloadHandlers(app: Application, onUpdate?: (updated: Application) => void): void {
  const assignBtn = document.getElementById('workload-assign-btn') as HTMLButtonElement | null;
  const input = document.getElementById('workload-project-input') as HTMLInputElement | null;

  assignBtn?.addEventListener('click', async () => {
    const projectId = input?.value.trim();
    if (!projectId) {
      toast('Enter a project ID or name first');
      return;
    }
    assignBtn.disabled = true;
    assignBtn.textContent = 'Assigning...';
    const res = await api.assignProject(app._id, projectId);
    if (res.success && res.data) {
      Object.assign(app, res.data);
      toast(`Project "${projectId}" assigned`);
      if (onUpdate) onUpdate(res.data);
      refreshWorkloadSection(res.data, onUpdate);
    } else {
      toast(res.message || 'Failed to assign project');
      assignBtn.disabled = false;
      assignBtn.textContent = 'Assign Project';
    }
  });

  document.querySelectorAll<HTMLButtonElement>('.workload-complete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const projectId = btn.dataset.projectId;
      if (!projectId) return;
      btn.disabled = true;
      btn.textContent = 'Completing...';
      const res = await api.completeProject(app._id, projectId);
      if (res.success && res.data) {
        Object.assign(app, res.data);
        toast(`Project "${projectId}" marked complete`);
        if (onUpdate) onUpdate(res.data);
        refreshWorkloadSection(res.data, onUpdate);
      } else {
        toast(res.message || 'Failed to complete project');
        btn.disabled = false;
        btn.textContent = 'Mark Complete';
      }
    });
  });
}

/** Re-renders the Compliance Documents section in place after a verify/reject action. */
function refreshComplianceDocSection(app: Application, onUpdate?: (updated: Application) => void): void {
  if (app.userType !== 'professional') return;
  const section = document.getElementById('compliance-doc-section');
  if (!section) return;
  section.outerHTML = renderComplianceDocuments(app);
  wireComplianceDocHandlers(app, onUpdate);
  const refreshed = document.getElementById('compliance-doc-section');
  if (refreshed) wireAttachmentDownloadButtons(refreshed);
}

/** Wires the Verify / Reject buttons for each compliance document. */
function wireComplianceDocHandlers(app: Application, onUpdate?: (updated: Application) => void): void {
  document.querySelectorAll<HTMLButtonElement>('.doc-verify-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const storedAs = btn.dataset.stored;
      if (!storedAs) return;
      btn.disabled = true;
      btn.textContent = 'Verifying...';
      const res = await api.verifyAttachment(app.refNumber, storedAs, true);
      if (res.success && res.data) {
        Object.assign(app, res.data);
        toast('Document verified');
        if (onUpdate) onUpdate(res.data);
        refreshComplianceDocSection(res.data, onUpdate);
      } else {
        toast(res.message || 'Failed to verify document');
        btn.disabled = false;
        btn.textContent = 'Verify';
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.doc-reject-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const storedAs = btn.dataset.stored;
      if (!storedAs) return;
      const reason = window.prompt('Reason for rejecting this document:');
      if (!reason || !reason.trim()) return;
      btn.disabled = true;
      btn.textContent = 'Rejecting...';
      const res = await api.verifyAttachment(app.refNumber, storedAs, false, reason.trim());
      if (res.success && res.data) {
        Object.assign(app, res.data);
        toast('Document rejected');
        if (onUpdate) onUpdate(res.data);
        refreshComplianceDocSection(res.data, onUpdate);
      } else {
        toast(res.message || 'Failed to reject document');
        btn.disabled = false;
        btn.textContent = 'Reject';
      }
    });
  });
}