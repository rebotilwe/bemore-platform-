import type { Page, Application, StatsData } from '../../types/index.ts';
import { api } from '../../api.ts';
import { store } from '../../store.ts';
import { CATEGORY_LABELS } from '../../constants/categories.ts';
import { STATUS_LABELS } from '../../constants/status.ts';
import { formatDate } from '../../utils/format.ts';
import { navigate } from '../../router.ts';
import { mountAdminLayout } from './layout.ts';

const TAG_CSS: Record<string, string> = {
  developer: 'tag-developer', landowner: 'tag-landowner', student: 'tag-student',
  professional: 'tag-professional', investor: 'tag-investor', aspiring: 'tag-aspiring',
};

function renderStatsRow(stats: StatsData): string {
  const devCount = stats.byType.find(t => t._id === 'developer')?.count ?? 0;
  const shortlisted = stats.byStatus.find(s => s._id === 'shortlisted')?.count ?? 0;
  const invited = stats.byStatus.find(s => s._id === 'invited')?.count ?? 0;

  return `
  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-card-accent"></div>
      <div class="stat-card-value display">${stats.total}</div>
      <div class="stat-card-label">Total Applications</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-accent"></div>
      <div class="stat-card-value display">${devCount}</div>
      <div class="stat-card-label">Developers</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-accent"></div>
      <div class="stat-card-value display">${shortlisted}</div>
      <div class="stat-card-label">Shortlisted</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-accent"></div>
      <div class="stat-card-value display">${invited}</div>
      <div class="stat-card-label">Invited</div>
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
    <div class="section-header">
      <h3 class="section-h">Recent Applications</h3>
    </div>
    ${renderRecentTable(stats.recentApps)}
  `;

  // Add click handlers for table rows — navigate to leads with search pre-filled
  document.querySelectorAll('.clickable-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = (row as HTMLElement).dataset.id;
      if (id) {
        store.set('filters', { ...store.get('filters'), search: id });
        navigate('/admin/leads');
      }
    });
  });
}
