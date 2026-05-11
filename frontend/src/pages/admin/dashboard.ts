import type { Page, Application, StatsData } from '../../types/index.ts';
import { api } from '../../api.ts';
import { CATEGORY_LABELS } from '../../constants/categories.ts';
import { STATUS_LABELS, STATUS_CSS } from '../../constants/status.ts';
import { formatDate, esc } from '../../utils/format.ts';
import { mountAdminLayout } from './layout.ts';
import { renderAppDetail, openModal } from '../../components/app-detail-modal.ts';
import { renderEmptyState, EMPTY_STATES } from '../../components/empty-state.ts';

const TAG_CSS: Record<string, string> = {
  developer: 'tag-developer', landowner: 'tag-landowner', student: 'tag-student',
  professional: 'tag-professional', investor: 'tag-investor', aspiring: 'tag-aspiring',
};

function renderStatsRow(stats: StatsData): string {
  const shortlisted = stats.byStatus.find(s => s._id === 'shortlisted')?.count ?? 0;
  const invited = stats.byStatus.find(s => s._id === 'invited')?.count ?? 0;
  const funded = stats.byStatus.find(s => s._id === 'funded')?.count ?? 0;
  const reviewing = stats.byStatus.find(s => s._id === 'reviewing')?.count ?? 0;
  const newCount = stats.byStatus.find(s => s._id === 'new')?.count ?? 0;
  const pipeline = shortlisted + invited + funded;
  const convRate = stats.total > 0 ? Math.round((pipeline / stats.total) * 100) : 0;

  return `
  <div class="dash-kpis">
    <div class="dash-kpi">
      <div class="dash-kpi-val display">${stats.total}</div>
      <div class="dash-kpi-lbl">Total Applications</div>
      <div class="dash-kpi-sub">${newCount} new this period</div>
    </div>
    <div class="dash-kpi">
      <div class="dash-kpi-val display">${reviewing}</div>
      <div class="dash-kpi-lbl">Under Review</div>
      <div class="dash-kpi-sub">Awaiting screening</div>
    </div>
    <div class="dash-kpi">
      <div class="dash-kpi-val display">${pipeline}</div>
      <div class="dash-kpi-lbl">In Pipeline</div>
      <div class="dash-kpi-sub">${shortlisted} shortlisted, ${invited} invited</div>
    </div>
    <div class="dash-kpi">
      <div class="dash-kpi-val display">${convRate}%</div>
      <div class="dash-kpi-lbl">Conversion</div>
      <div class="dash-kpi-sub">${funded} funded to date</div>
    </div>
  </div>`;
}

function renderFunnel(stats: StatsData): string {
  const total = stats.total || 1;
  const steps = [
    { label: 'New', count: stats.byStatus.find(s => s._id === 'new')?.count ?? 0, color: 'var(--steel-light)' },
    { label: 'Reviewing', count: stats.byStatus.find(s => s._id === 'reviewing')?.count ?? 0, color: 'var(--gold)' },
    { label: 'Shortlisted', count: stats.byStatus.find(s => s._id === 'shortlisted')?.count ?? 0, color: '#e8c97a' },
    { label: 'Invited', count: stats.byStatus.find(s => s._id === 'invited')?.count ?? 0, color: 'var(--green)' },
    { label: 'Funded', count: stats.byStatus.find(s => s._id === 'funded')?.count ?? 0, color: '#66bb6a' },
  ];

  return `
  <div class="dash-card">
    <div class="dash-card-header">
      <h3 class="dash-card-title">Application Funnel</h3>
      <a class="section-link" href="#/admin/analytics">Analytics →</a>
    </div>
    <div class="dash-funnel">
      ${steps.map(s => {
        const pct = Math.round((s.count / total) * 100);
        return `<div class="dash-funnel-step">
          <div class="dash-funnel-bar" style="width:${Math.max(pct, 8)}%;background:${s.color}">
            <span>${s.count}</span>
          </div>
          <div class="dash-funnel-info">
            <span class="dash-funnel-lbl">${s.label}</span>
            <span class="dash-funnel-pct">${pct}%</span>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function renderTypeBreakdown(stats: StatsData): string {
  const total = stats.total || 1;
  const types = [...stats.byType].sort((a, b) => b.count - a.count);

  return `
  <div class="dash-card">
    <div class="dash-card-header">
      <h3 class="dash-card-title">Profile Breakdown</h3>
      <a class="section-link" href="#/admin/leads">All Leads →</a>
    </div>
    <div class="dash-types">
      ${types.map(t => {
        const pct = Math.round((t.count / total) * 100);
        const label = (CATEGORY_LABELS as Record<string, string>)[t._id] || t._id;
        const cls = TAG_CSS[t._id] || '';
        return `<div class="dash-type-row">
          <span class="tag ${cls} dash-type-tag">${label}</span>
          <div class="dash-type-track"><div class="dash-type-fill" style="width:${pct}%"></div></div>
          <span class="dash-type-val">${t.count}</span>
          <span class="dash-type-pct">${pct}%</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function renderTopTags(stats: StatsData): string {
  const topTags = [...stats.byTag].sort((a, b) => b.count - a.count).slice(0, 8);
  if (!topTags.length) return '';

  return `
  <div class="dash-card">
    <div class="dash-card-header">
      <h3 class="dash-card-title">Top Intelligence Tags</h3>
      <a class="section-link" href="#/admin/analytics">View All →</a>
    </div>
    <div class="dash-tag-grid">
      ${topTags.map(t => `
        <div class="dash-tag-chip">
          <span class="dash-tag-name">${esc(t._id)}</span>
          <span class="dash-tag-count">${t.count}</span>
        </div>
      `).join('')}
    </div>
  </div>`;
}

const SOURCE_ICONS: Record<string, string> = {
  qr: '&#9635;', direct: '&#9654;', 'qr-brochure': '&#9783;', 'qr-banner': '&#9646;',
  'qr-badge': '&#9733;', 'qr-flyer': '&#9998;', referral: '&#9734;',
};

const CLASSIFICATION_CSS: Record<string, string> = {
  hot: 'tag-classification-hot', warm: 'tag-classification-warm',
  cold: 'tag-classification-cold', unclassified: '',
};

function renderSourceBreakdown(stats: StatsData): string {
  const sources = [...(stats.bySource ?? [])].sort((a, b) => b.count - a.count);
  const total = stats.total || 1;

  return `
  <div class="dash-card">
    <div class="dash-card-header">
      <h3 class="dash-card-title">Engagement Sources</h3>
      <span class="dash-card-hint">How users found the platform</span>
    </div>
    <div class="dash-sources">
      ${sources.length ? sources.map(s => {
        const pct = Math.round((s.count / total) * 100);
        const icon = SOURCE_ICONS[s._id] || '&#9679;';
        const isQr = s._id.startsWith('qr');
        return `<div class="dash-source-row">
          <span class="dash-source-icon${isQr ? ' qr' : ''}">${icon}</span>
          <span class="dash-source-name">${esc(s._id)}</span>
          <div class="dash-type-track"><div class="dash-type-fill${isQr ? ' qr-fill' : ''}" style="width:${pct}%"></div></div>
          <span class="dash-type-val">${s.count}</span>
          <span class="dash-type-pct">${pct}%</span>
        </div>`;
      }).join('') : '<p class="detail-empty">No source data yet. QR scans will appear here once users submit applications.</p>'}
    </div>
  </div>`;
}

function renderClassificationBreakdown(stats: StatsData): string {
  const items = [...(stats.byClassification ?? [])].sort((a, b) => b.count - a.count);
  const total = stats.total || 1;

  return `
  <div class="dash-card">
    <div class="dash-card-header">
      <h3 class="dash-card-title">Lead Classification</h3>
      <a class="section-link" href="#/admin/leads">Manage →</a>
    </div>
    <div class="dash-types">
      ${items.length ? items.map(c => {
        const pct = Math.round((c.count / total) * 100);
        const cls = CLASSIFICATION_CSS[c._id] || '';
        return `<div class="dash-type-row">
          <span class="tag ${cls} dash-type-tag">${c._id.charAt(0).toUpperCase() + c._id.slice(1)}</span>
          <div class="dash-type-track"><div class="dash-type-fill" style="width:${pct}%"></div></div>
          <span class="dash-type-val">${c.count}</span>
          <span class="dash-type-pct">${pct}%</span>
        </div>`;
      }).join('') : '<p class="detail-empty">No leads classified yet. Open a lead to classify as hot, warm, or cold.</p>'}
    </div>
  </div>`;
}

function renderQuickActions(): string {
  return `
  <div class="dash-card dash-card-actions">
    <h3 class="dash-card-title">Quick Actions</h3>
    <div class="dash-actions-grid">
      <a class="dash-action" href="#/admin/leads">
        <span class="dash-action-icon">&#9776;</span>
        <span>View All Leads</span>
      </a>
      <a class="dash-action" href="#/admin/reports">
        <span class="dash-action-icon">&#9670;</span>
        <span>Run Reports</span>
      </a>
      <a class="dash-action" href="#/admin/deal-room">
        <span class="dash-action-icon">&#9733;</span>
        <span>Deal Room</span>
      </a>
      <a class="dash-action" href="#/admin/analytics">
        <span class="dash-action-icon">&#9650;</span>
        <span>Analytics</span>
      </a>
    </div>
  </div>`;
}

function renderRecentTable(apps: Application[]): string {
  if (!apps.length) return renderEmptyState({ ...EMPTY_STATES.dashboard, message: 'No recent applications yet.' });

  // Mobile cards
  const cards = apps.map(app => {
    const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
    const typeLbl = (CATEGORY_LABELS as Record<string, string>)[app.userType] || app.userType;
    const typeCls = TAG_CSS[app.userType] || '';
    const statusLbl = (STATUS_LABELS as Record<string, string>)[app.status] || app.status;
    const statusCls = (STATUS_CSS as Record<string, string>)[app.status] || '';
    const date = app.submittedAt ? formatDate(app.submittedAt) : '';

    return `
    <div class="dash-recent-card" data-id="${app._id}">
      <div class="dash-recent-top">
        <span class="dash-recent-name">${esc(name)}</span>
        <span class="tag ${statusCls}">${esc(statusLbl)}</span>
      </div>
      <div class="dash-recent-meta">
        <span class="lead-card-ref">${esc(app.refNumber)}</span>
        <span class="tag ${typeCls}">${esc(typeLbl)}</span>
        <span class="dash-recent-date">${date}</span>
      </div>
    </div>`;
  }).join('');

  // Desktop table
  const rows = apps.map(app => {
    const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
    const typeBadge = `<span class="tag ${TAG_CSS[app.userType] || ''}">${esc((CATEGORY_LABELS as Record<string, string>)[app.userType] || app.userType)}</span>`;
    const statusLbl = (STATUS_LABELS as Record<string, string>)[app.status] || app.status;
    const statusCls = (STATUS_CSS as Record<string, string>)[app.status] || '';
    const tags = (app.tags ?? []).slice(0, 2).map(t => `<span class="tag-badge">${esc(t)}</span>`).join(' ');
    const date = app.submittedAt ? formatDate(app.submittedAt) : '';
    const fd = (app.formData as Record<string, unknown>) ?? {};
    // New keys first, legacy fallback second (spec §7.2 + FE-4 risk callouts).
    const value = (fd.projectValue as string)
      || (fd.investmentRange as string)
      || (fd.avgProjectSize as string)
      || (fd.estimatedValue as string)
      || '';

    return `<tr class="clickable-row" data-id="${app._id}">
      <td><span class="nc" data-id="${app._id}">${esc(name)}</span></td>
      <td>${typeBadge}</td>
      <td>${esc(value)}</td>
      <td>${tags}</td>
      <td>${date}</td>
      <td><span class="tag ${statusCls}">${esc(statusLbl)}</span></td>
    </tr>`;
  }).join('');

  return `
  <div class="dash-recent-cards">${cards}</div>
  <div class="dash-recent-table">
    <div class="tbl-wrap">
      <table class="dtbl">
        <thead>
          <tr><th>Name</th><th>Type</th><th>Value</th><th>Tags</th><th>Date</th><th>Status</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

export const dashboardPage: Page = {
  render() {
    return `
    <div class="dash-page">
      <div class="dash-page-header">
        <div>
          <h2 class="admin-main-title">Dashboard</h2>
          <p class="dash-header-sub">BeMore SME Access Initiative — Pipeline Overview</p>
        </div>
      </div>
      <div id="dash-content">
        <div class="dash-kpis">
          ${Array(4).fill('<div class="dash-kpi"><div class="skeleton skeleton-bar" style="height:32px;width:60px;margin-bottom:8px"></div><div class="skeleton skeleton-bar skeleton-bar--med" style="height:12px"></div></div>').join('')}
        </div>
        <div class="dash-grid-2">
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
        </div>
      </div>
    </div>`;
  },

  mount() {
    mountAdminLayout();
    loadDashboard();
  },
};

async function loadDashboard(): Promise<void> {
  const container = document.getElementById('dash-content');
  if (!container) return;

  const res = await api.getStats();
  if (!res.success || !res.data) {
    container.innerHTML = renderEmptyState({ 
      title: 'Failed to load', 
      message: res.message || 'Could not load dashboard data. Please try again.',
      icon: '⚠️'
    });
    return;
  }

  if (res.data.total === 0) {
    container.innerHTML = `
      ${renderEmptyState(EMPTY_STATES.dashboard)}
    `;
    return;
  }

  const stats = res.data;
  container.innerHTML = `
    ${renderStatsRow(stats)}
    <div class="dash-grid-2">
      ${renderFunnel(stats)}
      ${renderTypeBreakdown(stats)}
    </div>
    <div class="dash-grid-2">
      ${renderSourceBreakdown(stats)}
      ${renderClassificationBreakdown(stats)}
    </div>
    <div class="dash-grid-2">
      ${renderTopTags(stats)}
      ${renderQuickActions()}
    </div>
    <div class="dash-card">
      <div class="dash-card-header">
        <h3 class="dash-card-title">Recent Applications</h3>
        <a class="section-link" href="#/admin/leads">View All →</a>
      </div>
      ${renderRecentTable(stats.recentApps)}
    </div>
  `;

  // Click row/card → detail modal
  document.querySelectorAll<HTMLElement>('.clickable-row, .dash-recent-card').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      if (!id) return;
      const app = stats.recentApps.find(a => a._id === id);
      if (app) openModal(renderAppDetail(app), app, () => loadDashboard());
    });
  });

  // Desktop table name click
  document.querySelectorAll<HTMLElement>('.dtbl .nc').forEach(cell => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = cell.dataset.id;
      const app = stats.recentApps.find(a => a._id === id);
      if (app) openModal(renderAppDetail(app), app, () => loadDashboard());
    });
  });
}
