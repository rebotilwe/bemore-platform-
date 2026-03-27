import type { Page, Application, ReportName } from '../../types/index.ts';
import { api } from '../../api.ts';
import { CATEGORY_LABELS } from '../../constants/categories.ts';
import { STATUS_CSS, STATUS_LABELS } from '../../constants/status.ts';
import { formatDate } from '../../utils/format.ts';
import { mountAdminLayout } from './layout.ts';

interface ReportMeta {
  name: ReportName;
  title: string;
  description: string;
}

const REPORTS: ReportMeta[] = [
  { name: 'high-value-developers',       title: 'Funding Threshold Report',  description: 'Developers flagged as HIGH_VALUE or LARGE_CAPITAL seeking significant funding.' },
  { name: 'pipeline-ready-land',         title: 'Land Readiness Report',     description: 'Landowners with PIPELINE_READY assets available for development.' },
  { name: 'institutional-grade-housing', title: 'Student Housing Report',    description: 'Operators meeting INSTITUTIONAL_GRADE criteria for student accommodation.' },
  { name: 'deal-room-shortlist',         title: 'Deal Room Shortlist',       description: 'All shortlisted and invited applicants ready for deal room access.' },
];

function renderReportCards(): string {
  return `
  <div class="reports-grid">
    ${REPORTS.map(r => `
      <div class="report-card" data-report="${r.name}">
        <h3 class="report-card-h">${r.title}</h3>
        <p class="report-card-p">${r.description}</p>
        <button class="btn-action" data-report="${r.name}">Run Report</button>
      </div>
    `).join('')}
  </div>`;
}

function renderReportResults(title: string, apps: Application[]): string {
  if (!apps.length) return `<p class="empty-state">No results for this report.</p>`;

  const rows = apps.map(app => {
    const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
    const typeLbl = CATEGORY_LABELS[app.userType] || app.userType;
    const tags = (app.tags ?? []).slice(0, 3).map(t => `<span class="tag-badge">${t}</span>`).join(' ');
    const statusCls = STATUS_CSS[app.status] || '';
    const statusLbl = STATUS_LABELS[app.status] || app.status;
    const date = app.submittedAt ? formatDate(app.submittedAt) : '';

    return `<tr>
      <td>${app.refNumber}</td>
      <td>${name}</td>
      <td>${typeLbl}</td>
      <td>${tags}</td>
      <td><span class="badge ${statusCls}">${statusLbl}</span></td>
      <td>${date}</td>
    </tr>`;
  }).join('');

  return `
  <div class="report-results">
    <h3 class="section-h">${title} <span class="result-count">(${apps.length})</span></h3>
    <div class="tbl-wrap">
      <table class="dtbl">
        <thead>
          <tr><th>Ref</th><th>Name</th><th>Type</th><th>Tags</th><th>Status</th><th>Date</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

export const reportsPage: Page = {
  render() {
    return `
    <div class="reports-page">
      <h2 class="page-h">Reports</h2>
      ${renderReportCards()}
      <div id="report-output"></div>
    </div>`;
  },

  mount() {
    mountAdminLayout();

    document.querySelectorAll('[data-report]').forEach(el => {
      if (el.tagName === 'BUTTON') {
        el.addEventListener('click', async (e) => {
          const name = (e.currentTarget as HTMLButtonElement).dataset.report as ReportName;
          const output = document.getElementById('report-output');
          if (!output) return;

          output.innerHTML = '<p>Loading...</p>';

          const meta = REPORTS.find(r => r.name === name);
          const res = await api.getReport(name);

          if (res.success && res.data) {
            output.innerHTML = renderReportResults(meta?.title ?? name, res.data.data);
          } else {
            output.innerHTML = '<p>Failed to load report.</p>';
          }
        });
      }
    });
  },
};
