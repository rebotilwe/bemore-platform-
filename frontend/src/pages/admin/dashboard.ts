import type { Page, Application, StatsData } from '../../types/index.ts';
import { api } from '../../api.ts';
import { CATEGORY_LABELS } from '../../constants/categories.ts';
import { STATUS_LABELS } from '../../constants/status.ts';
import { formatDate } from '../../utils/format.ts';
import { mountAdminLayout } from './layout.ts';
import { renderAppDetail, openModal } from '../../components/app-detail-modal.ts';

const TAG_CSS: Record<string, string> = {
  developer: 'tag-developer', landowner: 'tag-landowner', student: 'tag-student',
  professional: 'tag-professional', investor: 'tag-investor', aspiring: 'tag-aspiring',
};

function renderStatsRow(stats: StatsData): string {
  const shortlisted = stats.byStatus.find(s => s._id === 'shortlisted')?.count ?? 0;
  const invited = stats.byStatus.find(s => s._id === 'invited')?.count ?? 0;
  const funded = stats.byStatus.find(s => s._id === 'funded')?.count ?? 0;
  const newCount = stats.byStatus.find(s => s._id === 'new')?.count ?? 0;

  return `
  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-card-accent"></div>
      <div class="stat-card-value display">${stats.total}</div>
      <div class="stat-card-label">Total Applications</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-accent"></div>
      <div class="stat-card-value display">${newCount}</div>
      <div class="stat-card-label">New / Pending</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-accent"></div>
      <div class="stat-card-value display">${shortlisted}</div>
      <div class="stat-card-label">Shortlisted</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-accent"></div>
      <div class="stat-card-value display">${invited + funded}</div>
      <div class="stat-card-label">Invited / Funded</div>
    </div>
  </div>`;
}

function renderFunnelMini(stats: StatsData): string {
  const total = stats.total || 1;
  const steps = [
    { label: 'New', count: stats.byStatus.find(s => s._id === 'new')?.count ?? 0, color: 'var(--steel-light)' },
    { label: 'Reviewing', count: stats.byStatus.find(s => s._id === 'reviewing')?.count ?? 0, color: 'var(--gold)' },
    { label: 'Shortlisted', count: stats.byStatus.find(s => s._id === 'shortlisted')?.count ?? 0, color: '#e8c97a' },
    { label: 'Invited', count: stats.byStatus.find(s => s._id === 'invited')?.count ?? 0, color: 'var(--green)' },
    { label: 'Funded', count: stats.byStatus.find(s => s._id === 'funded')?.count ?? 0, color: '#66bb6a' },
  ];

  return `
  <div class="dash-section">
    <div class="section-header">
      <h3 class="section-h">Application Funnel</h3>
      <a class="section-link" href="#/admin/analytics">View Analytics →</a>
    </div>
    <div class="dash-funnel">
      ${steps.map(s => {
        const pct = Math.round((s.count / total) * 100);
        return `<div class="dash-funnel-step">
          <div class="dash-funnel-bar" style="width:${Math.max(pct, 6)}%;background:${s.color}">
            <span>${s.count}</span>
          </div>
          <div class="dash-funnel-lbl">${s.label}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function renderTypeBreakdown(stats: StatsData): string {
  const total = stats.total || 1;
  const types = stats.byType.sort((a, b) => b.count - a.count);

  return `
  <div class="dash-section">
    <h3 class="section-h">Profile Types</h3>
    <div class="dash-types">
      ${types.map(t => {
        const pct = Math.round((t.count / total) * 100);
        const label = (CATEGORY_LABELS as Record<string, string>)[t._id] || t._id;
        return `<div class="dash-type-row">
          <span class="dash-type-label">${label}</span>
          <div class="dash-type-track"><div class="dash-type-fill" style="width:${pct}%"></div></div>
          <span class="dash-type-val">${t.count}</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function renderRecentTable(apps: Application[]): string {
  if (!apps.length) return '<p class="empty-state">No applications yet.</p>';

  const rows = apps.map(app => {
    const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
    const typeBadge = `<span class="tag ${TAG_CSS[app.userType] || ''}">${CATEGORY_LABELS[app.userType] || app.userType}</span>`;
    const tags = (app.tags ?? []).slice(0, 2).map(t => `<span class="tag-badge">${t}</span>`).join(' ');
    const date = app.submittedAt ? formatDate(app.submittedAt) : '';
    const statusLbl = STATUS_LABELS[app.status] || app.status;

    return `<tr class="clickable-row" data-id="${app._id}">
      <td><span class="nc">${name}</span></td>
      <td>${typeBadge}</td>
      <td>${tags}</td>
      <td>${date}</td>
      <td><span class="tag tag-shortlist">${statusLbl}</span></td>
    </tr>`;
  }).join('');

  return `
  <div class="tbl-wrap">
    <table class="dtbl">
      <thead>
        <tr><th>Name</th><th>Type</th><th>Tags</th><th>Date</th><th>Status</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

export const dashboardPage: Page = {
  render() {
    return `
    <div class="dash-page">
      <h2 class="admin-main-title">Dashboard</h2>
      <div id="dash-content">
        <p class="loading-state">Loading...</p>
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
    container.innerHTML = '<p class="empty-state">Failed to load dashboard data.</p>';
    return;
  }

  const stats = res.data;
  container.innerHTML = `
    ${renderStatsRow(stats)}
    <div class="dash-two-col">
      ${renderFunnelMini(stats)}
      ${renderTypeBreakdown(stats)}
    </div>
    <div class="dash-section">
      <div class="section-header">
        <h3 class="section-h">Recent Applications</h3>
        <a class="section-link" href="#/admin/leads">View All →</a>
      </div>
      ${renderRecentTable(stats.recentApps)}
    </div>
  `;

  // Click row → open detail modal
  document.querySelectorAll('.clickable-row').forEach(row => {
    row.addEventListener('click', async () => {
      const id = (row as HTMLElement).dataset.id;
      if (!id) return;
      const app = stats.recentApps.find(a => a._id === id);
      if (app) {
        openModal(renderAppDetail(app));
      }
    });
  });
}
