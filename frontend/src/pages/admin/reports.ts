import type { Page, Application, ReportName } from '../../types/index.ts';
import { api } from '../../api.ts';
import { CATEGORY_LABELS } from '../../constants/categories.ts';
import { STATUS_CSS, STATUS_LABELS } from '../../constants/status.ts';
import { formatDate } from '../../utils/format.ts';
import { exportCsv } from '../../utils/csv.ts';
import { toast } from '../../components/toast.ts';
import { mountAdminLayout } from './layout.ts';
import { renderAppDetail, openModal } from '../../components/app-detail-modal.ts';
import { renderEmptyState, EMPTY_STATES } from '../../components/empty-state.ts';
import { setButtonLoading } from '../../components/loading-button.ts';
import { exportPdfReport } from '../../utils/pdf-report.ts';

const TAG_CSS: Record<string, string> = {
  developer: 'tag-developer', landowner: 'tag-landowner', student: 'tag-student',
  professional: 'tag-professional', investor: 'tag-investor', aspiring: 'tag-aspiring',
};

interface ReportMeta {
  name: ReportName;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const REPORTS: ReportMeta[] = [
  {
    name: 'high-value-developers',
    title: 'Funding Threshold',
    description: 'Developers flagged as HIGH_VALUE or LARGE_CAPITAL seeking significant institutional funding.',
    icon: '&#9650;',
    color: '#c9a84c',
  },
  {
    name: 'pipeline-ready-land',
    title: 'Land Readiness',
    description: 'Landowners with PIPELINE_READY assets — land secured with active project stage.',
    icon: '&#9632;',
    color: '#4cb87a',
  },
  {
    name: 'institutional-grade-housing',
    title: 'Student Housing',
    description: 'Operators meeting INSTITUTIONAL_GRADE criteria for student accommodation.',
    icon: '&#9679;',
    color: '#7ab8e8',
  },
  {
    name: 'deal-room-shortlist',
    title: 'Deal Room Shortlist',
    description: 'All shortlisted and invited applicants ready for deal room access and funding partner alignment.',
    icon: '&#9733;',
    color: '#e8a47a',
  },
];

let activeReport: ReportName | null = null;
let reportApps: Application[] = [];

function renderReportCards(): string {
  return `
  <div class="rpt-grid">
    ${REPORTS.map(r => `
      <button class="rpt-card" data-report="${r.name}">
        <div class="rpt-card-icon" style="color:${r.color}">${r.icon}</div>
        <div class="rpt-card-body">
          <h3 class="rpt-card-title">${r.title}</h3>
          <p class="rpt-card-desc">${r.description}</p>
        </div>
        <div class="rpt-card-arrow">→</div>
      </button>
    `).join('')}
  </div>`;
}

function renderResults(meta: ReportMeta, apps: Application[]): string {
  if (!apps.length) {
    return `
    <div class="rpt-results">
      <div class="rpt-results-header">
        <div>
          <h3 class="rpt-results-title">${meta.title}</h3>
          <p class="rpt-results-sub">No matching applications found.</p>
        </div>
        <button class="btn-ghost rpt-back" id="rpt-back">← All Reports</button>
      </div>
      ${renderEmptyState(EMPTY_STATES.report)}
    </div>`;
  }

  const rows = apps.map(app => {
    const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
    const typeLbl = (CATEGORY_LABELS as Record<string, string>)[app.userType] || app.userType;
    const typeCls = TAG_CSS[app.userType] || '';
    const tags = (app.tags ?? []).slice(0, 3).map(t => `<span class="tag-badge">${t}</span>`).join(' ');
    const statusCls = (STATUS_CSS as Record<string, string>)[app.status] || '';
    const statusLbl = (STATUS_LABELS as Record<string, string>)[app.status] || app.status;
    const date = app.submittedAt ? formatDate(app.submittedAt) : '';
    const value = (app.formData as Record<string, unknown>)?.estimatedValue as string || '';

    return `<tr class="rpt-row" data-id="${app._id}">
      <td><span class="nc">${name}</span></td>
      <td>${app.refNumber}</td>
      <td><span class="tag ${typeCls}">${typeLbl}</span></td>
      <td>${value}</td>
      <td>${tags}</td>
      <td><span class="tag ${statusCls}">${statusLbl}</span></td>
      <td>${date}</td>
    </tr>`;
  }).join('');

  // Summary by type
  const typeCounts: Record<string, number> = {};
  apps.forEach(a => { typeCounts[a.userType] = (typeCounts[a.userType] || 0) + 1; });
  const typeBreakdown = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `<span class="rpt-stat-chip"><span class="tag ${TAG_CSS[type] || ''}">${(CATEGORY_LABELS as Record<string, string>)[type] || type}</span> ${count}</span>`)
    .join('');

  return `
  <div class="rpt-results">
    <div class="rpt-results-header">
      <div>
        <h3 class="rpt-results-title">${meta.title} <span class="rpt-results-count">${apps.length}</span></h3>
        <p class="rpt-results-sub">${meta.description}</p>
      </div>
      <div class="rpt-results-actions">
        <button class="export-btn" id="rpt-export-pdf">Export PDF</button>
        <button class="export-btn" id="rpt-export">Export CSV</button>
        <button class="btn-ghost rpt-back" id="rpt-back">← All Reports</button>
      </div>
    </div>
    <div class="rpt-stat-row">${typeBreakdown}</div>
    <div class="rpt-table-cards">
      ${apps.map(app => {
        const name2 = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
        const typeLbl2 = (CATEGORY_LABELS as Record<string, string>)[app.userType] || app.userType;
        const typeCls2 = TAG_CSS[app.userType] || '';
        const statusLbl2 = (STATUS_LABELS as Record<string, string>)[app.status] || app.status;
        const statusCls2 = (STATUS_CSS as Record<string, string>)[app.status] || '';
        const val2 = (app.formData as Record<string, unknown>)?.estimatedValue as string || '';
        const tags2 = (app.tags ?? []).slice(0, 2).map(t => `<span class="tag-badge">${t}</span>`).join(' ');
        return `
        <div class="rpt-mcard" data-id="${app._id}">
          <div class="rpt-mcard-top">
            <span class="rpt-mcard-name">${name2}</span>
            <span class="tag ${statusCls2}">${statusLbl2}</span>
          </div>
          <div class="rpt-mcard-meta">
            <span class="rpt-mcard-ref">${app.refNumber}</span>
            <span class="tag ${typeCls2}">${typeLbl2}</span>
            ${val2 ? `<span class="rpt-mcard-val">${val2}</span>` : ''}
          </div>
          ${tags2 ? `<div class="rpt-mcard-tags">${tags2}</div>` : ''}
        </div>`;
      }).join('')}
    </div>
    <div class="rpt-table-desktop">
      <div class="tbl-wrap">
        <table class="dtbl">
          <thead>
            <tr><th>Name</th><th>Ref</th><th>Type</th><th>Value</th><th>Tags</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function bindResults(): void {
  document.getElementById('rpt-back')?.addEventListener('click', () => {
    activeReport = null;
    reportApps = [];
    const output = document.getElementById('report-output');
    const grid = document.querySelector('.rpt-grid') as HTMLElement;
    if (output) output.innerHTML = '';
    if (grid) grid.style.display = '';
    document.querySelectorAll('.rpt-card').forEach(c => c.classList.remove('active'));
  });

  document.getElementById('rpt-export-pdf')?.addEventListener('click', () => {
    if (!reportApps.length) return;
    const meta = REPORTS.find(r => r.name === activeReport);
    if (!meta) return;
    try {
      exportPdfReport(reportApps, { title: meta.title, description: meta.description, color: meta.color });
      toast(`${meta.title} PDF generated`);
    } catch {
      toast('Failed to generate PDF');
    }
  });

  document.getElementById('rpt-export')?.addEventListener('click', () => {
    const btn = document.getElementById('rpt-export') as HTMLButtonElement;
    if (!reportApps.length) return;
    const meta = REPORTS.find(r => r.name === activeReport);
    setButtonLoading(btn, true, 'Exporting...');
    try {
      exportCsv(reportApps, `bemore-${activeReport}-${new Date().toISOString().split('T')[0]}.csv`);
      toast(`${meta?.title ?? 'Report'} exported`);
    } catch {
      toast('Failed to export CSV');
    }
    setButtonLoading(btn, false);
  });

  // Click row/card → detail modal
  document.querySelectorAll('.rpt-row, .rpt-mcard').forEach(el => {
    el.addEventListener('click', () => {
      const id = (el as HTMLElement).dataset.id;
      const app = reportApps.find(a => a._id === id);
      if (app) openModal(renderAppDetail(app), app);
    });
  });
}

export const reportsPage: Page = {
  render() {
    return `
    <div class="reports-page">
      <div class="rpt-page-header">
        <h2 class="admin-main-title">Reports</h2>
        <p class="rpt-page-sub">Pre-built intelligence reports for deal screening and funding partner alignment.</p>
      </div>
      ${renderReportCards()}
      <div id="report-output"></div>
    </div>`;
  },

  mount() {
    mountAdminLayout();

    document.querySelectorAll<HTMLButtonElement>('.rpt-card').forEach(card => {
      card.addEventListener('click', async () => {
        const name = card.dataset.report as ReportName;
        const output = document.getElementById('report-output');
        const grid = document.querySelector('.rpt-grid') as HTMLElement;
        if (!output) return;

        // Highlight active card, hide grid
        document.querySelectorAll('.rpt-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        output.innerHTML = '<p class="loading-state"><span class="spinner"></span> Running report...</p>';

        const meta = REPORTS.find(r => r.name === name)!;
        const res = await api.getReport(name);

        if (res.success && res.data) {
          activeReport = name;
          reportApps = res.data.data;
          if (grid) grid.style.display = 'none';
          output.innerHTML = renderResults(meta, res.data.data);
          bindResults();
        } else {
          output.innerHTML = '<p class="empty-state">Failed to load report.</p>';
        }
      });
    });
  },
};
