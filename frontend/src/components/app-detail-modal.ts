import type { Application } from '../types/index.ts';
import { CATEGORY_LABELS } from '../constants/categories.ts';
import { STATUS_LABELS } from '../constants/status.ts';
import { formatDate } from '../utils/format.ts';

function detailRow(key: string, value: string | undefined): string {
  if (!value) return '';
  return `<div class="detail-row"><div class="detail-key">${key}</div><div class="detail-val">${value}</div></div>`;
}

export function renderAppDetail(app: Application): string {
  const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
  const typeLbl = CATEGORY_LABELS[app.userType] || app.userType;
  const statusLbl = STATUS_LABELS[app.status] || app.status;
  const tags = (app.tags ?? []).map(t => `<span class="tag-badge">${t}</span>`).join(' ');
  const funders = (app.dealRoom?.funders ?? []).map(f => `<span class="tag-badge">${f}</span>`).join(' ');
  const fd = app.formData as Record<string, unknown> ?? {};

  return `
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <div class="modal-title">${name}</div>
          <div class="modal-sub">${app.refNumber} · ${typeLbl}</div>
        </div>
        <button class="modal-close" id="modal-close-btn" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="detail-section-label">Personal Details</div>
        ${detailRow('First Name', app.personal?.firstName)}
        ${detailRow('Surname', app.personal?.surname)}
        ${detailRow('Email', app.personal?.email)}
        ${detailRow('Phone', app.personal?.phone)}
        ${detailRow('Company', app.personal?.companyName)}

        <div class="detail-section-label">Application</div>
        ${detailRow('Status', statusLbl)}
        ${detailRow('Profile Type', typeLbl)}
        ${detailRow('Submitted', app.submittedAt ? formatDate(app.submittedAt) : '')}
        ${detailRow('Updated', app.updatedAt ? formatDate(app.updatedAt) : '')}
        ${tags ? `<div class="detail-row"><div class="detail-key">Tags</div><div class="detail-val">${tags}</div></div>` : ''}

        <div class="detail-section-label">Form Data</div>
        ${detailRow('Land Status', fd.landStatus as string)}
        ${detailRow('Project Stage', fd.projectStage as string)}
        ${detailRow('Estimated Value', fd.estimatedValue as string)}
        ${detailRow('Previous Funding', fd.previousFunding as string)}
        ${detailRow('Seeking', Array.isArray(fd.seeking) ? (fd.seeking as string[]).join(', ') : fd.seeking as string)}
        ${detailRow('Summit Attendance', fd.summitAttendance as string)}
        ${fd.projectDescription ? `<div class="detail-row full"><div class="detail-key">Project Description</div><div class="detail-val">${fd.projectDescription as string}</div></div>` : ''}
        ${fd.whyChooseYou ? `<div class="detail-row full"><div class="detail-key">Why Choose You</div><div class="detail-val">${fd.whyChooseYou as string}</div></div>` : ''}

        <div class="detail-section-label">Deal Room</div>
        ${detailRow('Summit Access', app.dealRoom?.summitAccess ? 'Yes' : 'No')}
        ${detailRow('Deal Room Entry', app.dealRoom?.dealRoomEntry ? 'Yes' : 'No')}
        ${funders ? `<div class="detail-row"><div class="detail-key">Funders</div><div class="detail-val">${funders}</div></div>` : ''}
        ${detailRow('Admin Notes', app.adminNotes)}
      </div>
    </div>`;
}

export function openModal(html: string): void {
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
  };
  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}
