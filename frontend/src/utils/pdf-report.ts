/**
 * Generate a professional PDF report by opening a print-ready window.
 * Uses the browser's native Print → Save as PDF. Zero dependencies.
 */

import type { Application } from '../types/index.ts';
import { CATEGORY_LABELS } from '../constants/categories.ts';
import { STATUS_LABELS } from '../constants/status.ts';
import { formatDate } from './format.ts';

interface ReportConfig {
  title: string;
  description: string;
  color: string;
}

export function exportPdfReport(apps: Application[], config: ReportConfig): void {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

  // Summary stats
  const typeCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  let totalValue = 0;

  apps.forEach(a => {
    typeCounts[a.userType] = (typeCounts[a.userType] || 0) + 1;
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    (a.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    const val = (a.formData as Record<string, unknown>)?.estimatedValue as string || '';
    if (val.includes('R100m')) totalValue += 100;
    else if (val.includes('R20m')) totalValue += 50;
    else if (val.includes('R5m')) totalValue += 10;
  });

  const typeRows = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `<tr><td>${(CATEGORY_LABELS as Record<string, string>)[type] || type}</td><td style="text-align:right;font-weight:700">${count}</td><td style="text-align:right;color:#8a8a9a">${Math.round((count / apps.length) * 100)}%</td></tr>`)
    .join('');

  const statusRows = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => `<tr><td>${(STATUS_LABELS as Record<string, string>)[status] || status}</td><td style="text-align:right;font-weight:700">${count}</td></tr>`)
    .join('');

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => `<span style="display:inline-block;padding:3px 10px;margin:2px;background:#f5f0e5;border-radius:4px;font-size:11px;color:#333">${tag} <strong>${count}</strong></span>`)
    .join('');

  // Application rows
  const appRows = apps.map((app, i) => {
    const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
    const type = (CATEGORY_LABELS as Record<string, string>)[app.userType] || app.userType;
    const status = (STATUS_LABELS as Record<string, string>)[app.status] || app.status;
    const value = (app.formData as Record<string, unknown>)?.estimatedValue as string || '-';
    const tags = (app.tags || []).slice(0, 3).join(', ');
    const date = app.submittedAt ? formatDate(app.submittedAt) : '-';
    const company = app.personal?.companyName || '-';
    const bg = i % 2 === 0 ? '#fff' : '#faf8f4';

    return `<tr style="background:${bg}">
      <td style="font-weight:600">${name}</td>
      <td style="font-size:11px;color:#666">${app.refNumber}</td>
      <td>${type}</td>
      <td>${company}</td>
      <td>${value}</td>
      <td style="font-size:10px">${tags}</td>
      <td>${status}</td>
      <td style="font-size:11px">${date}</td>
    </tr>`;
  }).join('');

  // Detail cards for each application
  const detailCards = apps.map((app, i) => {
    const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
    const type = (CATEGORY_LABELS as Record<string, string>)[app.userType] || app.userType;
    const status = (STATUS_LABELS as Record<string, string>)[app.status] || app.status;
    const fd = (app.formData as Record<string, unknown>) || {};
    const tags = (app.tags || []).map(t => `<span style="display:inline-block;padding:2px 8px;margin:1px;background:#f5f0e5;border-radius:3px;font-size:10px">${t}</span>`).join(' ');

    return `
    <div style="page-break-inside:avoid;border:1px solid #e0d9c8;border-radius:8px;padding:16px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <strong style="font-size:14px">${i + 1}. ${name}</strong>
          <span style="margin-left:8px;font-size:11px;color:#888">${app.refNumber}</span>
        </div>
        <span style="padding:2px 10px;border-radius:4px;font-size:11px;font-weight:600;background:${status === 'Funded' ? '#d4edda' : status === 'Invited' ? '#cce5ff' : status === 'Shortlisted' ? '#fff3cd' : '#f0f0f0'};color:#333">${status}</span>
      </div>
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <tr><td style="color:#888;width:120px;padding:2px 0">Profile</td><td>${type}</td><td style="color:#888;width:120px">Company</td><td>${app.personal?.companyName || '-'}</td></tr>
        <tr><td style="color:#888;padding:2px 0">Email</td><td>${app.personal?.email || '-'}</td><td style="color:#888">Phone</td><td>${app.personal?.phone || '-'}</td></tr>
        <tr><td style="color:#888;padding:2px 0">Est. Value</td><td>${fd.estimatedValue || '-'}</td><td style="color:#888">Land Status</td><td>${fd.landStatus || '-'}</td></tr>
        <tr><td style="color:#888;padding:2px 0">Project Stage</td><td>${fd.projectStage || '-'}</td><td style="color:#888">Seeking</td><td>${Array.isArray(fd.seeking) ? (fd.seeking as string[]).join(', ') : fd.seeking || '-'}</td></tr>
      </table>
      ${tags ? `<div style="margin-top:6px">${tags}</div>` : ''}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en-ZA">
<head>
<meta charset="UTF-8">
<title>${config.title} — BeMore Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 13px; color: #333; line-height: 1.5; }

  .header { background: #0a0a0f; color: #fff; padding: 32px; text-align: center; }
  .header h1 { font-size: 24px; color: #c9a84c; margin-bottom: 4px; letter-spacing: 1px; }
  .header .sub { font-size: 12px; color: #b4b4c4; letter-spacing: 2px; text-transform: uppercase; }
  .header .cobrand { font-size: 11px; color: #888; margin-top: 12px; }

  .meta-bar { display: flex; justify-content: space-between; padding: 16px 32px; background: #f9f5ee; border-bottom: 2px solid #c9a84c; font-size: 12px; color: #666; }

  .container { padding: 24px 32px; }

  .report-title { font-size: 20px; font-weight: 700; color: #0a0a0f; margin-bottom: 4px; }
  .report-desc { font-size: 13px; color: #666; margin-bottom: 20px; }
  .report-count { display: inline-block; background: ${config.color}20; color: ${config.color}; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; margin-left: 8px; }

  .summary-grid { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .summary-card { flex: 1; min-width: 180px; border: 1px solid #e0d9c8; border-radius: 8px; padding: 14px; }
  .summary-card h4 { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .summary-card table { width: 100%; font-size: 12px; border-collapse: collapse; }
  .summary-card td { padding: 3px 0; border-bottom: 1px solid #f0ece3; }

  .tags-section { margin-bottom: 24px; }
  .tags-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }

  .main-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
  .main-table th { background: #0a0a0f; color: #c9a84c; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  .main-table td { padding: 7px 10px; border-bottom: 1px solid #ece7dc; }

  .details-section { margin-top: 8px; }
  .details-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; page-break-before: always; }

  .footer { text-align: center; padding: 20px; font-size: 10px; color: #aaa; border-top: 1px solid #e0d9c8; margin-top: 24px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
    .header { padding: 24px; }
    .container { padding: 16px 24px; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>BeMore</h1>
  <div class="sub">SME Access Initiative</div>
  <div class="cobrand">BeMore Group &times; PBSA — Institutional Funding Partnership</div>
</div>

<div class="meta-bar">
  <span><strong>Report:</strong> ${config.title}</span>
  <span><strong>Generated:</strong> ${dateStr} at ${timeStr}</span>
  <span><strong>Records:</strong> ${apps.length}</span>
</div>

<div class="container">
  <h2 class="report-title">${config.title} <span class="report-count">${apps.length}</span></h2>
  <p class="report-desc">${config.description}</p>

  <div class="summary-grid">
    <div class="summary-card">
      <h4>By Profile Type</h4>
      <table>${typeRows}</table>
    </div>
    <div class="summary-card">
      <h4>By Status</h4>
      <table>${statusRows}</table>
    </div>
    <div class="summary-card">
      <h4>Overview</h4>
      <table>
        <tr><td>Total Applications</td><td style="text-align:right;font-weight:700">${apps.length}</td></tr>
        <tr><td>Est. Pipeline Value</td><td style="text-align:right;font-weight:700">~R${totalValue}M+</td></tr>
        <tr><td>Unique Profile Types</td><td style="text-align:right;font-weight:700">${Object.keys(typeCounts).length}</td></tr>
        <tr><td>Intelligence Tags</td><td style="text-align:right;font-weight:700">${Object.keys(tagCounts).length}</td></tr>
      </table>
    </div>
  </div>

  <div class="tags-section">
    <div class="tags-label">Top Intelligence Tags</div>
    ${topTags}
  </div>

  <h3 style="font-size:14px;margin-bottom:8px">Application Summary</h3>
  <table class="main-table">
    <thead>
      <tr><th>Name</th><th>Ref</th><th>Type</th><th>Company</th><th>Value</th><th>Tags</th><th>Status</th><th>Date</th></tr>
    </thead>
    <tbody>${appRows}</tbody>
  </table>

  <div class="details-section">
    <h3 class="details-title">Detailed Application Profiles</h3>
    ${detailCards}
  </div>
</div>

<div class="footer">
  BeMore Group (Pty) Ltd &times; PBSA — Confidential Report — ${dateStr}
</div>

<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 500); };
</script>

</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    // Popup blocked — fall back to download as HTML
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.title.replace(/\s+/g, '-').toLowerCase()}-report.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
