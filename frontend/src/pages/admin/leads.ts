import type { Page, Application, ApplicationStatus } from '../../types/index.ts';
import { api } from '../../api.ts';
import { store } from '../../store.ts';
import { toast } from '../../components/toast.ts';
import { CATEGORY_LABELS } from '../../constants/categories.ts';
import { STATUS_LABELS, STATUS_CSS } from '../../constants/status.ts';
import { LEGACY_TAGS, TAG_LABELS } from '../../constants/tags.ts';
import { formatDate, esc } from '../../utils/format.ts';
import { exportCsv } from '../../utils/csv.ts';
import { mountAdminLayout } from './layout.ts';
import { renderAppDetail, openModal } from '../../components/app-detail-modal.ts';
import { showBulkStatusConfirm } from '../../components/confirm-dialog.ts';
import { renderEmptyState, EMPTY_STATES } from '../../components/empty-state.ts';
import { setButtonLoading } from '../../components/loading-button.ts';

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

/** Always-visible composite / universal tag chips. Spec §6.7. */
const UNIVERSAL_CHIPS: { tag: string; label: string }[] = [
  { tag: 'ACTIVELY_LOOKING', label: 'Actively looking' },
  { tag: 'OPEN_TO_OPPORTUNITY', label: 'Open' },
  { tag: 'LOW_INTENT', label: 'Low intent' },
  { tag: 'PIPELINE_READY', label: 'Pipeline ready' },
  { tag: 'HOT_INVESTOR', label: 'Hot investor' },
  { tag: 'INSTITUTIONAL_OPERATOR', label: 'Institutional operator' },
];

/** Profile-conditional chips. Spec §6.7.1 — verbatim. */
const PROFILE_CHIPS: Record<string, { tag: string; label: string }[]> = {
  developer: [
    { tag: 'SHOVEL_READY', label: 'Shovel ready' },
    { tag: 'FUNDING_GAP', label: 'Funding gap' },
    { tag: 'HIGH_VALUE', label: 'High value' },
    { tag: 'STUDENT_FOCUS', label: 'Student focus' },
  ],
  landowner: [
    { tag: 'LAND_SELLER', label: 'Sellers' },
    { tag: 'LAND_DEVELOPER', label: 'Developers' },
    { tag: 'LAND_JV', label: 'JV' },
    { tag: 'LAND_INCOME', label: 'Income' },
    { tag: 'WORK_STARTED', label: 'Work started' },
  ],
  investor: [
    { tag: 'LARGE_INVESTOR', label: 'Large' },
    { tag: 'EQUITY_INVESTOR', label: 'Equity' },
    { tag: 'DEBT_FUNDER', label: 'Debt' },
    { tag: 'JV_PARTNER', label: 'JV' },
    { tag: 'ACTIVE_DEPLOYER', label: 'Active deployer' },
  ],
  student: [
    { tag: 'LARGE_OPERATOR', label: 'Large' },
    { tag: 'MID_OPERATOR', label: 'Mid-size' },
    { tag: 'HIGH_OCCUPANCY', label: 'High occupancy' },
    { tag: 'GROWTH_FOCUS', label: 'Growth focus' },
  ],
  professional: [
    { tag: 'SENIOR_PRO', label: 'Senior' },
    { tag: 'MULTI_PROVINCE', label: 'Multi-province' },
    { tag: 'STUDENT_ACC_EXP', label: 'Student acc exp' },
    { tag: 'MAJOR_PROJECTS', label: 'Major projects' },
    { tag: 'INDEPENDENT', label: 'Independent' },
  ],
  aspiring: [
    { tag: 'HAS_LAND', label: 'Has land' },
    { tag: 'READY_NOW', label: 'Ready now' },
    { tag: 'NEEDS_FUNDING', label: 'Needs funding' },
    { tag: 'NEEDS_KNOWLEDGE', label: 'Needs knowledge' },
  ],
};

let currentApps: Application[] = [];
let totalCount = 0;
let selectedIds = new Set<string>();
let activeChipTags = new Set<string>();
let sortField = 'submittedAt';
let sortDir: 'asc' | 'desc' = 'desc';
let searchTimer: ReturnType<typeof setTimeout>;

function sortIcon(field: string): string {
  if (field !== sortField) return '<span class="sort-icon">&#8597;</span>';
  return sortDir === 'asc'
    ? '<span class="sort-icon active">&#8593;</span>'
    : '<span class="sort-icon active">&#8595;</span>';
}

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
  </div>
  ${renderChipBar()}`;
}

/**
 * Render the tag-chip filter bar. Universal/composite chips are always
 * visible; profile-conditional chips appear only when a profile filter
 * is active (spec §6.7 + §6.7.1). Active chips render in gold, inactive
 * neutral. Multiple chips combine with AND semantics in `chipFilter()`.
 * Legacy tags (spec §9.5) are NEVER rendered.
 */
function renderChipBar(): string {
  const filters = store.get('filters');
  const profile = filters.userType;
  const profileChips = (profile && profile !== 'all' && PROFILE_CHIPS[profile]) || [];

  const renderChip = (c: { tag: string; label: string }): string => {
    if (LEGACY_TAGS.has(c.tag)) return '';
    const active = activeChipTags.has(c.tag) ? ' active' : '';
    return `<button class="chip-filter${active}" data-chip="${esc(c.tag)}" type="button">${esc(c.label)}</button>`;
  };

  const universalHtml = UNIVERSAL_CHIPS.map(renderChip).join('');
  const profileHtml = profileChips.map(renderChip).join('');
  const sep = profileHtml ? '<span class="chip-sep" aria-hidden="true">·</span>' : '';

  return `
  <div class="chip-bar" id="leads-chip-bar" role="group" aria-label="Tag filters">
    ${universalHtml}
    ${sep}
    ${profileHtml}
  </div>`;
}

/** Apply active chip-filter set to the loaded apps with AND semantics. */
function applyChipFilter(apps: Application[]): Application[] {
  if (!activeChipTags.size) return apps;
  return apps.filter((a) => {
    const tagSet = new Set(a.tags ?? []);
    for (const t of activeChipTags) {
      if (!tagSet.has(t)) return false;
    }
    return true;
  });
}

function renderResultCount(): string {
  return `<div class="leads-result-count" id="leads-count">Showing <strong>${currentApps.length}</strong> of <strong>${totalCount}</strong> leads</div>`;
}

function renderBulkBar(): string {
  const statusOpts = ['new', 'reviewing', 'shortlisted', 'invited', 'funded']
    .map(s => `<option value="${s}">${(STATUS_LABELS as Record<string, string>)[s] || s}</option>`).join('');
  return `
  <div class="bulk-bar" id="bulk-bar" style="display:none">
    <span class="bulk-count" id="bulk-count">0 selected</span>
    <select class="bulk-status-select" id="bulk-status-select">
      <option value="">Change Status To...</option>
      ${statusOpts}
    </select>
    <button class="btn-action" id="bulk-apply">Apply</button>
    <button class="btn-action" id="bulk-remind" style="background:var(--gold);color:var(--ink)">Send Reminders</button>
    <button class="btn-ghost bulk-clear" id="bulk-clear">Clear</button>
  </div>`;
}

function getQuickInfo(userType: string, fd: Record<string, unknown>): string {
  // New keys first, legacy fallbacks second so old applications still display.
  switch (userType) {
    case 'developer':
      return (fd.projectValue as string) || (fd.estimatedValue as string) || '';
    case 'aspiring': {
      const newType = (fd.aspiringDevType as string) || '';
      const legacy = (fd.developmentInterests as string[])?.slice(0, 2).join(' · ');
      return newType || legacy || 'Aspiring Developer';
    }
    case 'investor':
      return (fd.investmentRange as string) || (fd.investmentAmount as string) || '';
    case 'landowner':
      return [
        (fd.landSize as string) || '',
        (fd.landOutcome as string) || (fd.zoningStatus as string) || '',
      ].filter(Boolean).join(' · ');
    case 'student':
      return [
        (fd.portfolioSize as string) || (fd.totalBedCount as string) || '',
        (fd.occupancyLevel as string) || (fd.averageOccupancy as string) || '',
      ].filter(Boolean).join(' · ');
    case 'professional':
      return [
        (fd.primaryRole as string) || (fd.profession as string) || '',
        (fd.avgProjectSize as string) || (fd.typicalProjectValue as string) || '',
      ].filter(Boolean).join(' · ');
    default:
      return '';
  }
}

/** Strip legacy tags before rendering chip badges (spec §9.5). */
function visibleTagBadges(tags: readonly string[] | undefined, limit = 2): string {
  if (!tags) return '';
  return tags
    .filter((t) => !LEGACY_TAGS.has(t))
    .slice(0, limit)
    .map((t) => `<span class="tag-badge">${esc(TAG_LABELS[t] ?? t)}</span>`)
    .join(' ');
}

function renderCards(apps: Application[]): string {
  if (!apps.length) return renderEmptyState({ ...EMPTY_STATES.search, message: 'No leads match your filters.' });

  return `<div class="leads-cards">${apps.map(app => {
    const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
    const typeCls = TAG_CSS[app.userType] || '';
    const typeLbl = (CATEGORY_LABELS as Record<string, string>)[app.userType] || app.userType;
    const statusLbl = (STATUS_LABELS as Record<string, string>)[app.status] || app.status;
    const statusCls = (STATUS_CSS as Record<string, string>)[app.status] || '';
    const email = app.personal?.email ?? '';
    const company = app.personal?.companyName ?? '';
    const date = app.submittedAt ? formatDate(app.submittedAt) : '';
    const tags = visibleTagBadges(app.tags, 2);
    const fd = (app.formData as Record<string, unknown>) ?? {};
    const quickInfo = getQuickInfo(app.userType, fd);
    const isShortlisted = app.status === 'shortlisted';
    const btnLabel = isShortlisted ? '&#10003; Shortlisted' : 'Shortlist';
    const btnCls = isShortlisted ? 'btn-action active' : 'btn-action';

    return `
    <div class="lead-card" data-id="${app._id}">
      <div class="lead-card-top">
        <div class="lead-card-header">
          <span class="lead-card-ref">${esc(app.refNumber)}</span>
          <div class="lead-card-badges">
            <span class="tag ${typeCls}">${esc(typeLbl)}</span>
            <span class="tag ${statusCls}">${esc(statusLbl)}</span>
            ${app.classification && app.classification !== 'unclassified' ? `<span class="tag tag-classification-${esc(app.classification)}">${esc(app.classification.toUpperCase())}</span>` : ''}
            ${app.engagementSource && app.engagementSource !== 'direct' ? `<span class="tag tag-source">${esc(app.engagementSource)}</span>` : ''}
          </div>
        </div>
        <div class="lead-card-name" data-id="${app._id}">${esc(name)}</div>
        <div class="lead-card-meta-row">
          ${company ? `<span class="lead-card-company">${esc(company)}</span>` : ''}
          <span class="lead-card-email">${esc(email)}</span>
        </div>
      </div>
      <div class="lead-card-mid">
        ${quickInfo ? `<div class="lead-card-value">${esc(quickInfo)}</div>` : ''}
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
    const tags = visibleTagBadges(app.tags, 2);
    const fd = (app.formData as Record<string, unknown>) ?? {};
    // New keys take precedence; fall back to legacy keys for old applications.
    const value = (fd.projectValue as string)
      || (fd.investmentRange as string)
      || (fd.avgProjectSize as string)
      || (fd.estimatedValue as string)
      || (fd.investmentAmount as string)
      || (fd.typicalProjectValue as string)
      || '';
    const isShortlisted = app.status === 'shortlisted';
    const btnLabel = isShortlisted ? 'Remove' : 'Shortlist';
    const btnCls = isShortlisted ? 'btn-action active' : 'btn-action';

    return `<tr class="leads-tbl-row" data-id="${app._id}">
      <td><input type="checkbox" class="bulk-check" data-id="${app._id}" /></td>
      <td><span class="nc" data-id="${app._id}">${esc(name)}</span><div class="tbl-sub">${esc(company)}</div></td>
      <td><span class="lead-card-ref">${esc(app.refNumber)}</span></td>
      <td><span class="tag ${typeCls}">${esc(typeLbl)}</span></td>
      <td class="tbl-email">${esc(email)}</td>
      <td>${esc(value)}</td>
      <td>${tags}</td>
      <td><span class="tag ${statusCls}">${esc(statusLbl)}</span></td>
      <td class="tbl-date">${date}</td>
      <td><button class="${btnCls}" data-id="${app._id}" data-shortlisted="${isShortlisted}">${btnLabel}</button></td>
    </tr>`;
  }).join('');

  return `
  <div class="leads-table-view">
    <div class="tbl-wrap">
      <table class="dtbl">
        <thead>
          <tr>
            <th><input type="checkbox" id="bulk-check-all" /></th>
            <th class="sortable" data-sort="personal.surname">Name ${sortIcon('personal.surname')}</th>
            <th>Ref</th>
            <th class="sortable" data-sort="userType">Type ${sortIcon('userType')}</th>
            <th>Email</th>
            <th>Value</th>
            <th>Tags</th>
            <th class="sortable" data-sort="status">Status ${sortIcon('status')}</th>
            <th class="sortable" data-sort="submittedAt">Date ${sortIcon('submittedAt')}</th>
            <th>Action</th>
          </tr>
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
    sortBy: sortField,
    order: sortDir,
  });

  if (!res.success) {
    container.innerHTML = renderEmptyState({ 
      title: 'Failed to load', 
      message: res.message || 'Could not load leads. Please try again.',
      icon: '⚠️'
    });
    return;
  }

  if (res.data.length === 0) {
    container.innerHTML = renderEmptyState(EMPTY_STATES.leads);
    return;
  }

  const filtered = applyChipFilter(res.data);
  currentApps = filtered;
  totalCount = res.pagination?.total ?? res.data.length;

  selectedIds.clear();
  container.innerHTML = renderBulkBar() + renderResultCount() + renderCards(currentApps) + renderTable(currentApps);
  bindTableActions();
  bindDetailModal();
  bindBulkActions();
  bindSortHeaders();
}

/** Re-render the chip bar after a profile filter or chip toggle. */
function refreshChipBar(): void {
  const bar = document.getElementById('leads-chip-bar');
  if (!bar) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = renderChipBar();
  const fresh = wrap.firstElementChild;
  if (fresh) bar.replaceWith(fresh);
  bindChipFilter();
}

function bindChipFilter(): void {
  document.querySelectorAll<HTMLButtonElement>('.chip-filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.chip!;
      if (!tag || LEGACY_TAGS.has(tag)) return;
      if (activeChipTags.has(tag)) {
        activeChipTags.delete(tag);
        btn.classList.remove('active');
      } else {
        activeChipTags.add(tag);
        btn.classList.add('active');
      }
      loadLeads();
    });
  });
}

function bindSortHeaders(): void {
  document.querySelectorAll<HTMLElement>('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort!;
      if (sortField === field) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortDir = field === 'submittedAt' ? 'desc' : 'asc';
      }
      loadLeads();
    });
  });
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
      if (app) openModal(renderAppDetail(app), app, () => loadLeads());
    });
  });

  // Desktop table — click name
  document.querySelectorAll<HTMLElement>('.dtbl .nc').forEach(cell => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = cell.dataset.id;
      const app = currentApps.find(a => a._id === id);
      if (app) openModal(renderAppDetail(app), app, () => loadLeads());
    });
  });
}

function updateBulkBar(): void {
  const bar = document.getElementById('bulk-bar');
  const countEl = document.getElementById('bulk-count');
  if (!bar || !countEl) return;
  bar.style.display = selectedIds.size > 0 ? 'flex' : 'none';
  countEl.textContent = `${selectedIds.size} selected`;
}

function bindBulkActions(): void {
  // Individual checkboxes
  document.querySelectorAll<HTMLInputElement>('.bulk-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id!;
      if (cb.checked) selectedIds.add(id); else selectedIds.delete(id);
      updateBulkBar();
    });
  });

  // Select all
  document.getElementById('bulk-check-all')?.addEventListener('change', (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    document.querySelectorAll<HTMLInputElement>('.bulk-check').forEach(cb => {
      cb.checked = checked;
      const id = cb.dataset.id!;
      if (checked) selectedIds.add(id); else selectedIds.delete(id);
    });
    updateBulkBar();
  });

  // Apply bulk status with confirmation
  document.getElementById('bulk-apply')?.addEventListener('click', async () => {
    const select = document.getElementById('bulk-status-select') as HTMLSelectElement;
    const status = select.value;
    if (!status) { toast('Select a status first'); return; }
    if (!selectedIds.size) { toast('No leads selected'); return; }

    const btn = document.getElementById('bulk-apply') as HTMLButtonElement;
    
    showBulkStatusConfirm(selectedIds.size, async () => {
      setButtonLoading(btn, true, `Updating ${selectedIds.size}...`);
      
      const res = await api.bulkUpdateStatus([...selectedIds], status);
      if (res.success) {
        toast(`${selectedIds.size} applications updated to ${(STATUS_LABELS as Record<string, string>)[status]}`);
        selectedIds.clear();
        loadLeads();
      } else {
        toast(res.message || 'Bulk update failed');
      }
      setButtonLoading(btn, false);
    });
  });

  // Send reminders
  document.getElementById('bulk-remind')?.addEventListener('click', async () => {
    if (!selectedIds.size) { toast('No leads selected'); return; }

    const count = selectedIds.size;
    showBulkStatusConfirm(count, async () => {
      const btn = document.getElementById('bulk-remind') as HTMLButtonElement;
      setButtonLoading(btn, true, `Sending ${count}...`);

      const res = await api.sendReminders([...selectedIds]);
      if (res.success) {
        toast(`Reminders sent to ${res.data?.sent ?? count} applicant${(res.data?.sent ?? count) !== 1 ? 's' : ''}`);
        selectedIds.clear();
        updateBulkBar();
      } else {
        toast(res.message || 'Failed to send reminders');
      }
      setButtonLoading(btn, false);
    });
  });

  // Clear selection
  document.getElementById('bulk-clear')?.addEventListener('click', () => {
    selectedIds.clear();
    document.querySelectorAll<HTMLInputElement>('.bulk-check').forEach(cb => cb.checked = false);
    const all = document.getElementById('bulk-check-all') as HTMLInputElement;
    if (all) all.checked = false;
    updateBulkBar();
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
        <div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>
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

        // Drop any active profile-conditional chips that no longer apply.
        const validTags = new Set<string>(UNIVERSAL_CHIPS.map((c) => c.tag));
        const profileChipList = (type !== 'all' && PROFILE_CHIPS[type]) || [];
        profileChipList.forEach((c) => validTags.add(c.tag));
        for (const t of [...activeChipTags]) {
          if (!validTags.has(t)) activeChipTags.delete(t);
        }
        refreshChipBar();
        loadLeads();
      });
    });

    bindChipFilter();

    document.getElementById('leads-status')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      const filters = { ...store.get('filters'), status: val };
      store.set('filters', filters);
      loadLeads();
    });

    document.getElementById('leads-search')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const val = (e.target as HTMLInputElement).value;
        const filters = { ...store.get('filters'), search: val };
        store.set('filters', filters);
        loadLeads();
      }, 300);
    });

    document.getElementById('leads-export')?.addEventListener('click', async () => {
      const btn = document.getElementById('leads-export') as HTMLButtonElement;
      setButtonLoading(btn, true, 'Exporting...');
      // Fetch ALL records (not just current page)
      const allRes = await api.getApplications({ limit: 10000 });
      if (allRes.success && allRes.data.length) {
        exportCsv(allRes.data, `bemore-leads-${new Date().toISOString().split('T')[0]}.csv`);
        toast(`Exported ${allRes.data.length} leads`);
      } else {
        toast('No data to export');
      }
      setButtonLoading(btn, false);
    });

    loadLeads();
  },
  unmount() {
    clearTimeout(searchTimer);
  },
};
