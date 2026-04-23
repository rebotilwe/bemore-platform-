import type { Page, Application, FunderName } from '../../types/index.ts';
import { api } from '../../api.ts';
import { toast } from '../../components/toast.ts';
import { CATEGORY_LABELS } from '../../constants/categories.ts';
import { STATUS_LABELS, STATUS_CSS } from '../../constants/status.ts';
import { FUNDERS } from '../../constants/funders.ts';
import { formatDate, esc } from '../../utils/format.ts';
import { mountAdminLayout } from './layout.ts';
import { renderAppDetail, openModal } from '../../components/app-detail-modal.ts';

const TAG_CSS: Record<string, string> = {
  developer: 'tag-developer', landowner: 'tag-landowner', student: 'tag-student',
  professional: 'tag-professional', investor: 'tag-investor', aspiring: 'tag-aspiring',
};

function renderSummary(apps: Application[]): string {
  const shortlisted = apps.filter(a => a.status === 'shortlisted').length;
  const invited = apps.filter(a => a.status === 'invited').length;
  const funded = apps.filter(a => a.status === 'funded').length;
  const withSummit = apps.filter(a => a.dealRoom?.summitAccess).length;
  const withDealRoom = apps.filter(a => a.dealRoom?.dealRoomEntry).length;
  const funderCounts: Record<string, number> = {};
  apps.forEach(a => a.dealRoom?.funders?.forEach(f => { funderCounts[f] = (funderCounts[f] || 0) + 1; }));

  return `
  <div class="dr-summary">
    <div class="dr-summary-card">
      <div class="dr-summary-val display">${apps.length}</div>
      <div class="dr-summary-lbl">Total Pipeline</div>
    </div>
    <div class="dr-summary-card">
      <div class="dr-summary-val display">${shortlisted}</div>
      <div class="dr-summary-lbl">Shortlisted</div>
    </div>
    <div class="dr-summary-card">
      <div class="dr-summary-val display">${invited}</div>
      <div class="dr-summary-lbl">Invited</div>
    </div>
    <div class="dr-summary-card">
      <div class="dr-summary-val display">${funded}</div>
      <div class="dr-summary-lbl">Funded</div>
    </div>
    <div class="dr-summary-card">
      <div class="dr-summary-val display">${withSummit}</div>
      <div class="dr-summary-lbl">Summit Access</div>
    </div>
    <div class="dr-summary-card">
      <div class="dr-summary-val display">${withDealRoom}</div>
      <div class="dr-summary-lbl">Deal Room Entry</div>
    </div>
  </div>
  <div class="dr-funder-bar">
    ${FUNDERS.map(f => `<div class="dr-funder-stat"><span class="dr-funder-stat-name">${f}</span><span class="dr-funder-stat-count">${funderCounts[f] || 0}</span></div>`).join('')}
  </div>`;
}

function renderCard(app: Application): string {
  const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
  const typeLbl = (CATEGORY_LABELS as Record<string, string>)[app.userType] || app.userType;
  const typeCls = TAG_CSS[app.userType] || '';
  const statusLbl = (STATUS_LABELS as Record<string, string>)[app.status] || app.status;
  const statusCls = (STATUS_CSS as Record<string, string>)[app.status] || '';
  const summitChecked = app.dealRoom?.summitAccess ? ' checked' : '';
  const dealRoomChecked = app.dealRoom?.dealRoomEntry ? ' checked' : '';
  const activeFunders = app.dealRoom?.funders ?? [];
  const tags = (app.tags ?? []).slice(0, 3).map(t => `<span class="tag-badge">${esc(t)}</span>`).join('');
  const value = (app.formData as Record<string, unknown>)?.estimatedValue as string || '';
  const date = app.submittedAt ? formatDate(app.submittedAt) : '';

  const funderChips = FUNDERS.map(f => {
    const on = activeFunders.includes(f) ? ' on' : '';
    return `<button class="funder-chip${on}" data-app="${app._id}" data-funder="${esc(f)}">${esc(f)}</button>`;
  }).join('');

  return `
  <div class="dr-card" data-app-id="${app._id}">
    <div class="dr-card-top">
      <div class="dr-card-info">
        <div class="dr-card-name" data-id="${app._id}">${esc(name)}</div>
        <div class="dr-card-meta">
          <span class="dr-card-ref">${esc(app.refNumber)}</span>
          <span class="tag ${typeCls}">${esc(typeLbl)}</span>
          <span class="tag ${statusCls}">${esc(statusLbl)}</span>
        </div>
      </div>
    </div>
    <div class="dr-card-details">
      ${app.personal?.email ? `<div class="dr-detail"><span class="dr-detail-key">Email</span><span class="dr-detail-val">${esc(app.personal.email)}</span></div>` : ''}
      ${app.personal?.companyName ? `<div class="dr-detail"><span class="dr-detail-key">Company</span><span class="dr-detail-val">${esc(app.personal.companyName)}</span></div>` : ''}
      ${value ? `<div class="dr-detail"><span class="dr-detail-key">Value</span><span class="dr-detail-val">${esc(value)}</span></div>` : ''}
      ${date ? `<div class="dr-detail"><span class="dr-detail-key">Submitted</span><span class="dr-detail-val">${date}</span></div>` : ''}
    </div>
    ${tags ? `<div class="dr-card-tags">${tags}</div>` : ''}
    <div class="dr-card-controls">
      <div class="dr-card-section-lbl">Access</div>
      <div class="dr-checks">
        <label class="dr-check-label">
          <input type="checkbox" class="dr-checkbox" data-app="${app._id}" data-field="summitAccess"${summitChecked} />
          <span class="dr-check-custom"></span>
          Summit Access
        </label>
        <label class="dr-check-label">
          <input type="checkbox" class="dr-checkbox" data-app="${app._id}" data-field="dealRoomEntry"${dealRoomChecked} />
          <span class="dr-check-custom"></span>
          Deal Room Entry
        </label>
      </div>
      <div class="dr-card-section-lbl">Assign Funders</div>
      <div class="dr-funders">${funderChips}</div>
    </div>
  </div>`;
}

let allDealRoomApps: Application[] = [];

function filterAndRender(search: string): void {
  const container = document.getElementById('dr-content');
  if (!container) return;
  const q = search.toLowerCase();
  const filtered = q
    ? allDealRoomApps.filter(a =>
        a.personal?.firstName?.toLowerCase().includes(q) ||
        a.personal?.surname?.toLowerCase().includes(q) ||
        a.personal?.email?.toLowerCase().includes(q) ||
        a.refNumber?.toLowerCase().includes(q) ||
        a.personal?.companyName?.toLowerCase().includes(q)
      )
    : allDealRoomApps;

  if (!filtered.length) {
    container.innerHTML = `${renderSummary(allDealRoomApps)}<p class="empty-state">No results match "${search}".</p>`;
    return;
  }

  container.innerHTML = `
    ${renderSummary(allDealRoomApps)}
    <div class="dr-grid">${filtered.map(renderCard).join('')}</div>`;
  bindDealRoomActions(filtered);
}

async function loadDealRoom(): Promise<void> {
  const container = document.getElementById('dr-content');
  if (!container) return;

  const [res, res2, res3] = await Promise.all([
    api.getApplications({ status: 'shortlisted' }),
    api.getApplications({ status: 'invited' }),
    api.getApplications({ status: 'funded' }),
  ]);

  const apps: Application[] = [];
  if (res.success) apps.push(...res.data);
  if (res2.success) apps.push(...res2.data);
  if (res3.success) apps.push(...res3.data);

  if (!res.success && !res2.success && !res3.success) {
    container.innerHTML = '<p class="empty-state">Failed to load deal room data.</p>';
    return;
  }

  if (!apps.length) {
    container.innerHTML = '<p class="empty-state">No shortlisted, invited, or funded applications yet.</p>';
    return;
  }

  allDealRoomApps = apps;

  container.innerHTML = `
    ${renderSummary(apps)}
    <div class="dr-grid">${apps.map(renderCard).join('')}</div>`;

  bindDealRoomActions(apps);
}

function bindDealRoomActions(apps: Application[]): void {
  // Checkboxes
  document.querySelectorAll<HTMLInputElement>('.dr-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', async () => {
      const appId = checkbox.dataset.app!;
      const field = checkbox.dataset.field as 'summitAccess' | 'dealRoomEntry';
      const app = apps.find(a => a._id === appId);
      if (!app) return;

      const dealRoom = { ...app.dealRoom, [field]: checkbox.checked };
      const res = await api.updateApplication(appId, { dealRoom });
      if (res.success && res.data) {
        Object.assign(app.dealRoom, res.data.dealRoom ?? dealRoom);
        toast(`${field === 'summitAccess' ? 'Summit access' : 'Deal room entry'} ${checkbox.checked ? 'granted' : 'revoked'}`);
      }
    });
  });

  // Funder chips
  document.querySelectorAll<HTMLButtonElement>('.funder-chip[data-app]').forEach(chip => {
    chip.addEventListener('click', async () => {
      const appId = chip.dataset.app!;
      const funder = chip.dataset.funder as FunderName;
      const app = apps.find(a => a._id === appId);
      if (!app) return;

      const currentFunders = app.dealRoom?.funders ?? [];
      const idx = currentFunders.indexOf(funder);
      const newFunders = idx > -1
        ? currentFunders.filter(f => f !== funder)
        : [...currentFunders, funder];

      const dealRoom = { ...app.dealRoom, funders: newFunders };
      const res = await api.updateApplication(appId, { dealRoom });
      if (res.success && res.data) {
        app.dealRoom.funders = newFunders;
        chip.classList.toggle('on');
        toast(`${funder} ${idx > -1 ? 'removed' : 'assigned'}`);
      }
    });
  });

  // Click name → open detail modal
  document.querySelectorAll<HTMLElement>('.dr-card-name').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const app = apps.find(a => a._id === id);
      if (app) openModal(renderAppDetail(app), app, () => loadDealRoom());
    });
  });
}

export const dealRoomPage: Page = {
  render() {
    return `
    <div class="deal-room-page">
      <div class="dr-header">
        <h2 class="admin-main-title">Deal Room</h2>
        <div class="dr-header-sub">Manage summit access, deal room entry, and funding partner assignments</div>
      </div>
      <div class="dr-search-wrap">
        <span class="tbl-search-icon" aria-hidden="true">&#9906;</span>
        <input id="dr-search" class="tbl-search" type="text" placeholder="Search deal room by name, email, ref..." />
      </div>
      <div id="dr-content">
        <div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>
      </div>
    </div>`;
  },

  mount() {
    mountAdminLayout();
    loadDealRoom();

    let drSearchTimer: ReturnType<typeof setTimeout>;
    document.getElementById('dr-search')?.addEventListener('input', (e) => {
      clearTimeout(drSearchTimer);
      drSearchTimer = setTimeout(() => {
        filterAndRender((e.target as HTMLInputElement).value.trim());
      }, 250);
    });
  },
};
