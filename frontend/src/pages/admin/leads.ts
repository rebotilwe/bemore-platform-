import type { Page, Application, ApplicationStatus } from '../../types/index.ts';
import { api } from '../../api.ts';
import { store } from '../../store.ts';
import { toast } from '../../components/toast.ts';
import { CATEGORY_LABELS } from '../../constants/categories.ts';
import { STATUS_LABELS, STATUS_CSS } from '../../constants/status.ts';
import { formatDate } from '../../utils/format.ts';
import { exportCsv } from '../../utils/csv.ts';
import { mountAdminLayout } from './layout.ts';
import { renderAppDetail, openModal } from '../../components/app-detail-modal.ts';

const TAG_CSS: Record<string, string> = {
  developer: 'tag-developer', landowner: 'tag-landowner', student: 'tag-student',
  professional: 'tag-professional', investor: 'tag-investor', aspiring: 'tag-aspiring',
};

const FILTER_CATEGORIES: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'developer', label: 'Developer' },
  { value: 'landowner', label: 'Landowner' },
  { value: 'investor', label: 'Investor' },
  { value: 'student', label: 'Operator' },
  { value: 'professional', label: 'Professional' },
  { value: 'aspiring', label: 'Aspiring' },
];

let currentApps: Application[] = [];
let totalCount = 0;

function renderFilterBar(): string {
  const filters = store.get('filters');
  const tabs = FILTER_CATEGORIES.map(c => {
    const active = filters.userType === c.value ? ' active' : '';
    return `<button class="ft${active}" data-type="${c.value}">${c.label}</button>`;
  }).join('');

  const statusOptions = ['all', 'new', 'reviewing', 'shortlisted', 'invited', 'funded']
    .map(s => {
      const sel = filters.status === s ? ' selected' : '';
      const label = s === 'all' ? 'All Statuses' : (STATUS_LABELS as Record<string, string>)[s] || s;
      return `<option value="${s}"${sel}>${label}</option>`;
    }).join('');

  return `
  <div class="tbl-ctrl">
    <div class="tbl-search-wrap">
      <span class="tbl-search-icon" aria-hidden="true">&#9906;</span>
      <input id="leads-search" class="tbl-search" type="text" placeholder="Search name, email, ref..." value="${filters.search}" />
    </div>
    <select id="leads-status" class="tbl-select">${statusOptions}</select>
    <div class="ft-tabs">${tabs}</div>
  </div>`;
}

function renderResultCount(): string {
  return `<div class="leads-result-count" id="leads-count">Showing <strong>${currentApps.length}</strong> of <strong>${totalCount}</strong> leads</div>`;
}

function renderCards(apps: Application[]): string {
  if (!apps.length) return '<p class="empty-state">No leads match your filters.</p>';

  return `<div class="leads-cards">${apps.map(app => {
    const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
    const typeCls = TAG_CSS[app.userType] || '';
    const typeLbl = (CATEGORY_LABELS as Record<string, string>)[app.userType] || app.userType;
    const statusLbl = (STATUS_LABELS as Record<string, string>)[app.status] || app.status;
    const statusCls = (STATUS_CSS as Record<string, string>)[app.status] || '';
    const email = app.personal?.email ?? '';
    const company = app.personal?.companyName ?? '';
    const date = app.submittedAt ? formatDate(app.submittedAt) : '';
    const tags = (app.tags ?? []).slice(0, 2).map(t => `<span class="tag-badge">${t}</span>`).join('');
    const value = (app.formData as Record<string, unknown>)?.estimatedValue as string || '';
    const isShortlisted = app.status === 'shortlisted';
    const btnLabel = isShortlisted ? '&#10003; Shortlisted' : 'Shortlist';
    const btnCls = isShortlisted ? 'btn-action active' : 'btn-action';

    return `
    <div class="lead-card" data-id="${app._id}">
      <div class="lead-card-top">
        <div class="lead-card-header">
          <span class="lead-card-ref">${app.refNumber}</span>
          <div class="lead-card-badges">
            <span class="tag ${typeCls}">${typeLbl}</span>
            <span class="tag ${statusCls}">${statusLbl}</span>
          </div>
        </div>
        <div class="lead-card-name" data-id="${app._id}">${name}</div>
        <div class="lead-card-meta-row">
          ${company ? `<span class="lead-card-company">${company}</span>` : ''}
          <span class="lead-card-email">${email}</span>
        </div>
      </div>
      <div class="lead-card-mid">
        ${value ? `<div class="lead-card-value">${value}</div>` : ''}
        ${tags ? `<div class="lead-card-tags">${tags}</div>` : ''}
      </div>
      <div class="lead-card-bottom">
        <span class="lead-card-date">${date}</span>
        <button class="${btnCls}" data-id="${app._id}" data-shortlisted="${isShortlisted}">${btnLabel}</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function renderTable(apps: Application[]): string {
  if (!apps.length) return '';

  const rows = apps.map(app => {
    const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
    const typeCls = TAG_CSS[app.userType] || '';
    const typeLbl = (CATEGORY_LABELS as Record<string, string>)[app.userType] || app.userType;
    const statusLbl = (STATUS_LABELS as Record<string, string>)[app.status] || app.status;
    const statusCls = (STATUS_CSS as Record<string, string>)[app.status] || '';
    const email = app.personal?.email ?? '';
    const company = app.personal?.companyName ?? '';
    const date = app.submittedAt ? formatDate(app.submittedAt) : '';
    const tags = (app.tags ?? []).slice(0, 2).map(t => `<span class="tag-badge">${t}</span>`).join(' ');
    const value = (app.formData as Record<string, unknown>)?.estimatedValue as string || '';
    const isShortlisted = app.status === 'shortlisted';
    const btnLabel = isShortlisted ? 'Remove' : 'Shortlist';
    const btnCls = isShortlisted ? 'btn-action active' : 'btn-action';

    return `<tr class="leads-tbl-row" data-id="${app._id}">
      <td><span class="nc" data-id="${app._id}">${name}</span><div class="tbl-sub">${company}</div></td>
      <td><span class="lead-card-ref">${app.refNumber}</span></td>
      <td><span class="tag ${typeCls}">${typeLbl}</span></td>
      <td class="tbl-email">${email}</td>
      <td>${value}</td>
      <td>${tags}</td>
      <td><span class="tag ${statusCls}">${statusLbl}</span></td>
      <td class="tbl-date">${date}</td>
      <td><button class="${btnCls}" data-id="${app._id}" data-shortlisted="${isShortlisted}">${btnLabel}</button></td>
    </tr>`;
  }).join('');

  return `
  <div class="leads-table-view">
    <div class="tbl-wrap">
      <table class="dtbl">
        <thead>
          <tr><th>Name</th><th>Ref</th><th>Type</th><th>Email</th><th>Value</th><th>Tags</th><th>Status</th><th>Date</th><th>Action</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

async function loadLeads(): Promise<void> {
  const container = document.getElementById('leads-content');
  if (!container) return;

  const filters = store.get('filters');
  const res = await api.getApplications({
    userType: filters.userType,
    status: filters.status,
    search: filters.search,
  });

  if (!res.success) {
    container.innerHTML = '<p class="empty-state">Failed to load leads.</p>';
    return;
  }

  currentApps = res.data;
  totalCount = res.pagination?.total ?? res.data.length;

  container.innerHTML = renderResultCount() + renderCards(currentApps) + renderTable(currentApps);
  bindTableActions();
  bindDetailModal();
}

function bindTableActions(): void {
  document.querySelectorAll('[data-id].btn-action').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLButtonElement;
      const id = target.dataset.id!;
      const isShortlisted = target.dataset.shortlisted === 'true';
      const newStatus = isShortlisted ? 'new' : 'shortlisted';

      target.disabled = true;
      target.textContent = '...';

      const res = await api.updateApplication(id, { status: newStatus as ApplicationStatus });
      if (res.success) {
        toast(`Application ${newStatus === 'shortlisted' ? 'shortlisted' : 'removed from shortlist'}`);
        loadLeads();
      } else {
        target.disabled = false;
        target.textContent = isShortlisted ? 'Remove' : 'Shortlist';
      }
    });
  });
}

function bindDetailModal(): void {
  // Mobile cards — click name
  document.querySelectorAll<HTMLElement>('.lead-card .lead-card-name').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.id;
      const app = currentApps.find(a => a._id === id);
      if (app) openModal(renderAppDetail(app));
    });
  });

  // Desktop table — click name
  document.querySelectorAll<HTMLElement>('.dtbl .nc').forEach(cell => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = cell.dataset.id;
      const app = currentApps.find(a => a._id === id);
      if (app) openModal(renderAppDetail(app));
    });
  });
}

export const leadsPage: Page = {
  render() {
    return `
    <div class="leads-page">
      <div class="leads-header">
        <div>
          <h2 class="admin-main-title">All Leads</h2>
          <p class="leads-header-sub">Manage, filter, and shortlist applications.</p>
        </div>
        <button id="leads-export" class="export-btn">Export CSV</button>
      </div>
      ${renderFilterBar()}
      <div id="leads-content">
        <p class="loading-state">Loading...</p>
      </div>
    </div>`;
  },

  mount() {
    mountAdminLayout();

    document.querySelectorAll('.ft').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const type = target.dataset.type || 'all';
        const filters = { ...store.get('filters'), userType: type };
        store.set('filters', filters);
        document.querySelectorAll('.ft').forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        loadLeads();
      });
    });

    document.getElementById('leads-status')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      const filters = { ...store.get('filters'), status: val };
      store.set('filters', filters);
      loadLeads();
    });

    let searchTimer: ReturnType<typeof setTimeout>;
    document.getElementById('leads-search')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const val = (e.target as HTMLInputElement).value;
        const filters = { ...store.get('filters'), search: val };
        store.set('filters', filters);
        loadLeads();
      }, 300);
    });

    document.getElementById('leads-export')?.addEventListener('click', () => {
      if (currentApps.length) {
        exportCsv(currentApps, `bemore-leads-${new Date().toISOString().split('T')[0]}.csv`);
        toast('CSV exported');
      } else {
        toast('No data to export');
      }
    });

    loadLeads();
  },
};
