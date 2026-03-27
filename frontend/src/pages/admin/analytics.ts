import type { Page } from '../../types/index.ts';
import type { FunnelData, TrendData, TagAnalytics, DemographicsData, DealRoomAnalytics } from '../../types/api.ts';
import { api } from '../../api.ts';
import { CATEGORY_LABELS } from '../../constants/categories.ts';
import { mountAdminLayout } from './layout.ts';

function barChart(items: { label: string; value: number; color?: string }[], maxVal?: number): string {
  const max = maxVal || Math.max(...items.map(i => i.value), 1);
  return items.map(i => {
    const pct = Math.round((i.value / max) * 100);
    const color = i.color || 'var(--gold)';
    return `
      <div class="bar-row">
        <div class="bar-label">${i.label}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="bar-value">${i.value}</div>
      </div>`;
  }).join('');
}

function funnelChart(funnel: FunnelData['funnel']): string {
  const steps = [
    { label: 'New', value: funnel.new, color: 'var(--steel-light)' },
    { label: 'Reviewing', value: funnel.reviewing, color: 'var(--gold)' },
    { label: 'Shortlisted', value: funnel.shortlisted, color: '#e8c97a' },
    { label: 'Invited', value: funnel.invited, color: 'var(--green)' },
    { label: 'Funded', value: funnel.funded, color: '#66bb6a' },
  ];
  const max = Math.max(funnel.new, 1);
  return steps.map(s => {
    const pct = Math.round((s.value / max) * 100);
    return `
      <div class="funnel-step">
        <div class="funnel-bar" style="width:${Math.max(pct, 8)}%;background:${s.color}">
          <span class="funnel-val">${s.value}</span>
        </div>
        <div class="funnel-lbl">${s.label}</div>
        ${s.value > 0 && max > 0 ? `<div class="funnel-pct">${pct}%</div>` : ''}
      </div>`;
  }).join('');
}

function trendChart(data: TrendData): string {
  if (!data.data.length) return '<p class="empty-state">No data for this period.</p>';
  const max = Math.max(...data.data.map(d => d.total), 1);
  const barW = Math.max(Math.floor(100 / data.data.length) - 1, 2);
  const bars = data.data.map(d => {
    const pct = Math.round((d.total / max) * 100);
    return `<div class="trend-bar-wrap" style="width:${barW}%">
      <div class="trend-bar" style="height:${Math.max(pct, 4)}%" title="${d.period}: ${d.total}"></div>
      <div class="trend-bar-lbl">${d.period.slice(5)}</div>
    </div>`;
  }).join('');
  return `<div class="trend-chart">${bars}</div>`;
}

function renderFunnel(data: FunnelData): string {
  return `
    <div class="an-card an-card-wide">
      <h3 class="an-card-title">Conversion Funnel</h3>
      <div class="funnel-chart">${funnelChart(data.funnel)}</div>
    </div>
    <div class="an-card">
      <h3 class="an-card-title">By Profile Type</h3>
      ${barChart(data.byType.map(t => ({ label: (CATEGORY_LABELS as Record<string, string>)[t._id] || t._id, value: t.count })))}
    </div>
    <div class="an-card">
      <h3 class="an-card-title">By Status</h3>
      ${barChart(data.byStatus.map(s => ({ label: s._id, value: s.count })))}
    </div>`;
}

function renderTrends(data: TrendData): string {
  const total = data.data.reduce((s, d) => s + d.total, 0);
  return `
    <div class="an-card an-card-wide">
      <div class="an-card-header">
        <h3 class="an-card-title">Submissions Over Time</h3>
        <span class="an-card-stat">${total} total</span>
      </div>
      ${trendChart(data)}
    </div>`;
}

function renderTags(data: TagAnalytics): string {
  const top = data.tagDistribution.slice(0, 12);
  return `
    <div class="an-card an-card-wide">
      <h3 class="an-card-title">Tag Distribution</h3>
      ${barChart(top.map(t => ({ label: t._id, value: t.count })))}
    </div>
    <div class="an-card">
      <h3 class="an-card-title">Tag Co-occurrence</h3>
      ${data.tagCoOccurrence.slice(0, 8).map(c =>
        `<div class="cooc-row">
          <span class="tag-badge">${c._id.tag1}</span>
          <span class="cooc-plus">+</span>
          <span class="tag-badge">${c._id.tag2}</span>
          <span class="cooc-count">${c.count}</span>
        </div>`
      ).join('') || '<p class="empty-state">No co-occurrence data yet.</p>'}
    </div>`;
}

function renderDemographics(data: DemographicsData): string {
  return `
    <div class="an-card">
      <h3 class="an-card-title">Estimated Value</h3>
      ${barChart(data.byValue.filter(v => v._id).map(v => ({ label: v._id || 'N/A', value: v.count })))}
    </div>
    <div class="an-card">
      <h3 class="an-card-title">Funding History</h3>
      ${barChart(data.byFundingHistory.filter(v => v._id).map(v => ({ label: v._id || 'N/A', value: v.count })))}
    </div>
    <div class="an-card">
      <h3 class="an-card-title">Land Status</h3>
      ${barChart(data.byLandStatus.filter(v => v._id).map(v => ({ label: v._id || 'N/A', value: v.count })))}
    </div>`;
}

function renderDealRoom(data: DealRoomAnalytics): string {
  return `
    <div class="an-card">
      <h3 class="an-card-title">Deal Room Access</h3>
      <div class="an-kpi-row">
        <div class="an-kpi"><div class="an-kpi-val display">${data.summitAccess}</div><div class="an-kpi-lbl">Summit Access</div></div>
        <div class="an-kpi"><div class="an-kpi-val display">${data.dealRoomEntry}</div><div class="an-kpi-lbl">Deal Room Entry</div></div>
      </div>
    </div>
    <div class="an-card">
      <h3 class="an-card-title">Funder Assignments</h3>
      ${barChart(data.funderDistribution.map(f => ({ label: f._id, value: f.count, color: 'var(--gold)' })))}
    </div>`;
}

export const analyticsPage: Page = {
  render() {
    return `
    <div class="analytics-page">
      <div class="analytics-header">
        <h2 class="admin-main-title">Analytics</h2>
        <div class="an-range-btns">
          <button class="an-range active" data-range="7d">7D</button>
          <button class="an-range" data-range="30d">30D</button>
          <button class="an-range" data-range="90d">90D</button>
          <button class="an-range" data-range="1y">1Y</button>
        </div>
      </div>
      <div id="analytics-content"><p class="loading-state">Loading analytics...</p></div>
    </div>`;
  },

  mount() {
    mountAdminLayout();
    loadAnalytics('30d');

    document.querySelectorAll('.an-range').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const range = (e.currentTarget as HTMLButtonElement).dataset.range || '30d';
        document.querySelectorAll('.an-range').forEach(b => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        loadAnalytics(range);
      });
    });
  },
};

async function loadAnalytics(range: string): Promise<void> {
  const container = document.getElementById('analytics-content');
  if (!container) return;

  container.innerHTML = '<p class="loading-state">Loading analytics...</p>';

  const [funnelRes, trendsRes, tagsRes, demoRes, drRes] = await Promise.all([
    api.getAnalyticsFunnel(),
    api.getAnalyticsTrends('day', range),
    api.getAnalyticsTags(),
    api.getAnalyticsDemographics(),
    api.getAnalyticsDealRoom(),
  ]);

  let html = '<div class="an-grid">';

  if (funnelRes.success && funnelRes.data) html += renderFunnel(funnelRes.data);
  if (trendsRes.success && trendsRes.data) html += renderTrends(trendsRes.data);
  if (tagsRes.success && tagsRes.data) html += renderTags(tagsRes.data);
  if (demoRes.success && demoRes.data) html += renderDemographics(demoRes.data);
  if (drRes.success && drRes.data) html += renderDealRoom(drRes.data);

  html += '</div>';

  if (html === '<div class="an-grid"></div>') {
    html = '<p class="empty-state">No analytics data available. Submit some applications first.</p>';
  }

  container.innerHTML = html;
}
