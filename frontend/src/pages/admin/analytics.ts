import type { Page } from '../../types/index.ts';
import type { FunnelData, TrendData, TagAnalytics, DemographicsData, DealRoomAnalytics } from '../../types/api.ts';
import { api } from '../../api.ts';
import { CATEGORY_LABELS } from '../../constants/categories.ts';
import { mountAdminLayout } from './layout.ts';
import { barChart, donutStat, renderTrendChart } from '../../components/charts.ts';
import type { TrendPoint } from '../../components/charts.ts';

// ── Section renderers ──

function renderKPIs(funnel: FunnelData, dealRoom: DealRoomAnalytics): string {
  const total = funnel.funnel.new + funnel.funnel.reviewing + funnel.funnel.shortlisted + funnel.funnel.invited + funnel.funnel.funded;
  const pipeline = funnel.funnel.shortlisted + funnel.funnel.invited + funnel.funnel.funded;
  const convRate = total > 0 ? Math.round((pipeline / total) * 100) : 0;

  return `
  <div class="an-kpis">
    <div class="an-kpi-card">
      <div class="an-kpi-card-val display">${total}</div>
      <div class="an-kpi-card-lbl">Total Applications</div>
    </div>
    <div class="an-kpi-card">
      <div class="an-kpi-card-val display">${pipeline}</div>
      <div class="an-kpi-card-lbl">In Pipeline</div>
    </div>
    <div class="an-kpi-card">
      <div class="an-kpi-card-val display">${convRate}%</div>
      <div class="an-kpi-card-lbl">Conversion Rate</div>
    </div>
    <div class="an-kpi-card">
      <div class="an-kpi-card-val display">${dealRoom.summitAccess}</div>
      <div class="an-kpi-card-lbl">Summit Access</div>
    </div>
    <div class="an-kpi-card">
      <div class="an-kpi-card-val display">${dealRoom.dealRoomEntry}</div>
      <div class="an-kpi-card-lbl">Deal Room Entry</div>
    </div>
  </div>`;
}

function renderFunnel(data: FunnelData): string {
  const steps = [
    { label: 'New', value: data.funnel.new, color: 'var(--steel-light)' },
    { label: 'Reviewing', value: data.funnel.reviewing, color: 'var(--gold)' },
    { label: 'Shortlisted', value: data.funnel.shortlisted, color: '#e8c97a' },
    { label: 'Invited', value: data.funnel.invited, color: 'var(--green)' },
    { label: 'Funded', value: data.funnel.funded, color: '#66bb6a' },
  ];
  const max = Math.max(data.funnel.new, 1);

  return `
  <div class="an-section">
    <div class="an-section-label">Conversion Funnel</div>
    <div class="an-section-row">
      <div class="an-card an-card-grow">
        <h3 class="an-card-title">Status Pipeline</h3>
        <div class="funnel-chart">
          ${steps.map(s => {
            const pct = Math.round((s.value / max) * 100);
            return `
            <div class="funnel-step">
              <div class="funnel-bar" style="width:${Math.max(pct, 8)}%;background:${s.color}">
                <span class="funnel-val">${s.value}</span>
              </div>
              <div class="funnel-lbl">${s.label}</div>
              <div class="funnel-pct">${pct}%</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="an-card">
        <h3 class="an-card-title">By Profile Type</h3>
        ${barChart(data.byType.map(t => ({
          label: (CATEGORY_LABELS as Record<string, string>)[t._id] || t._id,
          value: t.count,
        })))}
      </div>
    </div>
  </div>`;
}

function trendDataToPoints(data: TrendData): TrendPoint[] {
  return data.data.map(d => ({ period: d.period, value: d.total }));
}

function renderTrends(data: TrendData): string {
  const total = data.data.reduce((s, d) => s + d.total, 0);
  const chart = renderTrendChart(trendDataToPoints(data));

  return `
  <div class="an-section">
    <div class="an-section-label">Submission Trends</div>
    <div class="an-card an-card-full">
      <div class="an-card-header">
        <h3 class="an-card-title">Submissions Over Time</h3>
        <div class="an-card-header-r">
          <span class="an-card-stat">${total} total</span>
          <div class="an-gran-btns">
            <button class="an-gran active" data-gran="day">Day</button>
            <button class="an-gran" data-gran="week">Week</button>
            <button class="an-gran" data-gran="month">Month</button>
          </div>
        </div>
      </div>
      <div id="trend-chart-area">${chart}</div>
    </div>
  </div>`;
}

function renderTags(data: TagAnalytics): string {
  const top = data.tagDistribution.slice(0, 15);

  return `
  <div class="an-section">
    <div class="an-section-label">Intelligence Tags</div>
    <div class="an-section-row">
      <div class="an-card an-card-grow">
        <h3 class="an-card-title">Tag Distribution <span class="an-card-badge">${data.tagDistribution.length} tags</span></h3>
        ${barChart(top.map(t => ({ label: t._id, value: t.count })))}
      </div>
      <div class="an-card">
        <h3 class="an-card-title">Tag Co-occurrence</h3>
        ${data.tagCoOccurrence.length
          ? data.tagCoOccurrence.slice(0, 10).map(c =>
            `<div class="cooc-row">
              <span class="tag-badge">${c._id.tag1}</span>
              <span class="cooc-plus">&amp;</span>
              <span class="tag-badge">${c._id.tag2}</span>
              <span class="cooc-count">${c.count}</span>
            </div>`
          ).join('')
          : '<p class="an-empty">Not enough data yet.</p>'}
      </div>
    </div>
  </div>`;
}

function renderDemographics(data: DemographicsData): string {
  return `
  <div class="an-section">
    <div class="an-section-label">Application Demographics</div>
    <div class="an-section-triple">
      <div class="an-card">
        <h3 class="an-card-title">Project Value</h3>
        ${barChart(data.byValue.filter(v => v._id).map(v => ({ label: v._id || 'N/A', value: v.count, color: '#c9a84c' })))}
      </div>
      <div class="an-card">
        <h3 class="an-card-title">Funding Position</h3>
        ${barChart(data.byFundingHistory.filter(v => v._id).map(v => ({ label: v._id || 'N/A', value: v.count, color: '#4cb87a' })))}
      </div>
      <div class="an-card">
        <h3 class="an-card-title">Land Outcome</h3>
        ${barChart(data.byLandStatus.filter(v => v._id).map(v => ({ label: v._id || 'N/A', value: v.count, color: '#7ab8e8' })))}
      </div>
    </div>
  </div>`;
}

function renderDealRoom(data: DealRoomAnalytics): string {
  return `
  <div class="an-section">
    <div class="an-section-label">Deal Room</div>
    <div class="an-section-row">
      <div class="an-card">
        <h3 class="an-card-title">Access Overview</h3>
        <div class="an-donut-row">
          ${donutStat(data.summitAccess, 'Summit Access', 'var(--gold)')}
          ${donutStat(data.dealRoomEntry, 'Deal Room Entry', 'var(--green)')}
        </div>
      </div>
      <div class="an-card">
        <h3 class="an-card-title">Funder Assignments</h3>
        ${barChart(data.funderDistribution.map(f => ({ label: f._id, value: f.count, color: 'var(--gold)' })))}
      </div>
    </div>
  </div>`;
}

// ── Page ──

let currentRange = '30d';
let cleanupFns: (() => void)[] = [];

function addCleanup(el: Element | null, event: string, handler: EventListener): void {
  if (!el) return;
  el.addEventListener(event, handler);
  cleanupFns.push(() => el.removeEventListener(event, handler));
}

export const analyticsPage: Page = {
  render() {
    return `
    <div class="analytics-page">
      <div class="analytics-header">
        <div>
          <h2 class="admin-main-title">Analytics</h2>
          <p class="an-header-sub">Application intelligence and pipeline insights.</p>
        </div>
        <div class="an-range-btns">
          <button class="an-range" data-range="7d">7D</button>
          <button class="an-range active" data-range="30d">30D</button>
          <button class="an-range" data-range="90d">90D</button>
          <button class="an-range" data-range="1y">1Y</button>
        </div>
      </div>
      <div id="analytics-content"><p class="loading-state">Loading analytics...</p></div>
    </div>`;
  },

  mount() {
    mountAdminLayout();
    cleanupFns = [];
    currentRange = '30d';
    loadAnalytics();

    document.querySelectorAll('.an-range').forEach(btn => {
      const handler = (e: Event) => {
        currentRange = (e.currentTarget as HTMLButtonElement).dataset.range || '30d';
        document.querySelectorAll('.an-range').forEach(b => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        loadAnalytics();
      };
      addCleanup(btn, 'click', handler);
    });
  },

  unmount() {
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];
  },
};

async function loadAnalytics(): Promise<void> {
  const container = document.getElementById('analytics-content');
  if (!container) return;

  container.innerHTML = '<p class="loading-state">Loading analytics...</p>';

  const [funnelRes, trendsRes, tagsRes, demoRes, drRes] = await Promise.all([
    api.getAnalyticsFunnel(),
    api.getAnalyticsTrends('day', currentRange),
    api.getAnalyticsTags(),
    api.getAnalyticsDemographics(),
    api.getAnalyticsDealRoom(),
  ]);

  let html = '';

  // KPIs row
  if (funnelRes.success && funnelRes.data && drRes.success && drRes.data) {
    html += renderKPIs(funnelRes.data, drRes.data);
  }

  if (funnelRes.success && funnelRes.data) html += renderFunnel(funnelRes.data);
  if (trendsRes.success && trendsRes.data) html += renderTrends(trendsRes.data);
  if (tagsRes.success && tagsRes.data) html += renderTags(tagsRes.data);
  if (demoRes.success && demoRes.data) html += renderDemographics(demoRes.data);
  if (drRes.success && drRes.data) html += renderDealRoom(drRes.data);

  if (!html) {
    html = '<p class="empty-state">No analytics data available. Submit some applications first.</p>';
  }

  container.innerHTML = html;

  // Granularity toggle for trends
  document.querySelectorAll('.an-gran').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const gran = (e.currentTarget as HTMLButtonElement).dataset.gran || 'day';
      document.querySelectorAll('.an-gran').forEach(b => b.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');

      const area = document.getElementById('trend-chart-area');
      if (!area) return;
      area.innerHTML = '<p class="loading-state" style="padding:var(--sp-8) 0">Loading...</p>';

      const res = await api.getAnalyticsTrends(gran, currentRange);
      if (res.success && res.data) {
        const total = res.data.data.reduce((s, d) => s + d.total, 0);
        area.innerHTML = renderTrendChart(trendDataToPoints(res.data));
        const statEl = area.closest('.an-card')?.querySelector('.an-card-stat');
        if (statEl) statEl.textContent = `${total} total`;
      }
    });
  });
}
