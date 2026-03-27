import type { Page, Application, ApplicationStatus } from '../../types/index.ts';
import { api } from '../../api.ts';
import { store } from '../../store.ts';
import { toast } from '../../components/toast.ts';
import { CATEGORY_LABELS } from '../../constants/categories.ts';
import { STATUS_LABELS } from '../../constants/status.ts';
import { formatDate } from '../../utils/format.ts';
import { exportCsv } from '../../utils/csv.ts';
import { mountAdminLayout } from './layout.ts';

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

function renderFilterBar(): string {
  const filters = store.get('filters');
  const tabs = FILTER_CATEGORIES.map(c => {
    const active = filters.userType === c.value ? ' active' : '';
    return `<button class="ft${active}" data-type="${c.value}">${c.label}</button>`;
  }).join('');

  const statusOptions = ['all', 'new', 'reviewing', 'shortlisted', 'invited', 'funded']
    .map(s => {
      const sel = filters.status === s ? ' selected' : '';
      const label = s === 'all' ? 'All Statuses' : STATUS_LABELS[s as ApplicationStatus] || s;
      return `<option value="${s}"${sel}>${label}</option>`;
    }).join('');

  return `
  <div class="tbl-ctrl">
    <input id="leads-search" class="tbl-search" type="text" placeholder="Search name, email, ref..." value="${filters.search}" />
    <select id="leads-status" class="tbl-select">${statusOptions}</select>
    <div class="ft-tabs">${tabs}</div>
  </div>`;
}

function renderCards(apps: Application[]): string {
  if (!apps.length) return '<p class="empty-state">No leads match your filters.</p>';

  const rows = apps.map(app => {
    const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
    const typeCls = TAG_CSS[app.userType] || '';
    const typeLbl = CATEGORY_LABELS[app.userType] || app.userType;
    const email = app.personal?.email ?? '';
    const company = app.personal?.companyName ?? '';
    const date = app.submittedAt ? formatDate(app.submittedAt) : '';
    const isShortlisted = app.status === 'shortlisted';
    const btnLabel = isShortlisted ? '✓ Shortlisted' : 'Shortlist';
    const btnCls = isShortlisted ? 'btn-action active' : 'btn-action';

    return `
    <div class="lead-card" data-id="${app._id}">
      <div class="lead-card-header">
        <span class="lead-card-ref">${app.refNumber}</span>
        <span class="tag ${typeCls}">${typeLbl}</span>
      </div>
      <div class="lead-card-name">${name}</div>
      <div class="lead-card-meta">${company || email}</div>
      <div class="lead-card-row">
        <span class="lead-card-date">${date}</span>
        <button class="${btnCls}" data-id="${app._id}" data-shortlisted="${isShortlisted}">${btnLabel}</button>
      </div>
    </div>`;
  }).join('');

  return `<div class="leads-cards">${rows}</div>`;
}

function renderTable(apps: Application[]): string {
  if (!apps.length) return '<p class="empty-state">No leads match your filters.</p>';

  const rows = apps.map(app => {
    const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
    const typeCls = TAG_CSS[app.userType] || '';
    const typeLbl = CATEGORY_LABELS[app.userType] || app.userType;
    const email = app.personal?.email ?? '';
    const company = app.personal?.companyName ?? '';
    const date = app.submittedAt ? formatDate(app.submittedAt) : '';
    const isShortlisted = app.status === 'shortlisted';
    const btnLabel = isShortlisted ? 'Remove' : 'Shortlist';
    const btnCls = isShortlisted ? 'btn-action active' : 'btn-action';

    return `<tr>
      <td>${app.refNumber}</td>
      <td>${name}</td>
      <td><span class="tag ${typeCls}">${typeLbl}</span></td>
      <td>${email}</td>
      <td>${company}</td>
      <td>${date}</td>
      <td><button class="${btnCls}" data-id="${app._id}" data-shortlisted="${isShortlisted}">${btnLabel}</button></td>
    </tr>`;
  }).join('');

  return `
  <div class="leads-table-view">
    <div class="tbl-wrap">
      <table class="dtbl">
        <thead>
          <tr><th>Ref</th><th>Name</th><th>Type</th><th>Email</th><th>Company</th><th>Date</th><th>Action</th></tr>
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
  container.innerHTML = renderCards(currentApps) + renderTable(currentApps);
  bindTableActions();
}

function bindTableActions(): void {
  document.querySelectorAll('[data-id].btn-action').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLButtonElement;
      const id = target.dataset.id!;
      const isShortlisted = target.dataset.shortlisted === 'true';
      const newStatus = isShortlisted ? 'new' : 'shortlisted';

      const res = await api.updateApplication(id, { status: newStatus as ApplicationStatus });
      if (res.success) {
        toast(`Application ${newStatus === 'shortlisted' ? 'shortlisted' : 'removed from shortlist'}`);
        loadLeads();
      }
    });
  });
}

export const leadsPage: Page = {
  render() {
    return `
    <div class="leads-page">
      <div class="leads-header">
        <h2 class="admin-main-title">All Leads</h2>
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

    // Category filter tabs
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

    // Status dropdown
    document.getElementById('leads-status')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      const filters = { ...store.get('filters'), status: val };
      store.set('filters', filters);
      loadLeads();
    });

    // Search input
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

    // Export CSV
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
