import type { Page } from '../../types/index.ts';
import type {
  TrafficOverview, TrafficTrends, ReferrerData, DeviceData,
  HourlyData, FormFunnelData, ClickData,
} from '../../types/api.ts';
import { api } from '../../api.ts';
import { mountAdminLayout } from './layout.ts';
import { barChart, renderTrendChart } from '../../components/charts.ts';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function pageName(path: string): string {
  const names: Record<string, string> = {
    '/': 'Home',
    '/gateway': 'Gateway',
    '/register': 'Register',
    '/about': 'About',
    '/success': 'Success',
    '/landing': 'Landing',
    '/mentee-meter': 'Mentee Meter',
    '/status': 'Status',
    '/admin/login': 'Admin Login',
    '/admin/dashboard': 'Dashboard',
    '/admin/leads': 'Leads',
    '/admin/analytics': 'Analytics',
    '/admin/reports': 'Reports',
    '/admin/deal-room': 'Deal Room',
    '/admin/traffic': 'Traffic',
    '/admin/audit-log': 'Audit Log',
    '/admin/qr': 'QR Codes',
    '/admin/polls': 'Polls',
    '/admin/settings': 'Settings',
    '/admin/guide': 'Guide',
  };
  return names[path] || path;
}

// ── Section renderers ──

function renderKPIs(data: TrafficOverview): string {
  return `
  <div class="an-kpis">
    <div class="an-kpi-card">
      <div class="an-kpi-card-val display">${data.pageViews.toLocaleString()}</div>
      <div class="an-kpi-card-lbl">Page Views</div>
    </div>
    <div class="an-kpi-card">
      <div class="an-kpi-card-val display">${data.uniqueVisitors.toLocaleString()}</div>
      <div class="an-kpi-card-lbl">Unique Visitors</div>
    </div>
    <div class="an-kpi-card">
      <div class="an-kpi-card-val display">${data.uniqueSessions.toLocaleString()}</div>
      <div class="an-kpi-card-lbl">Sessions</div>
    </div>
    <div class="an-kpi-card">
      <div class="an-kpi-card-val display">${formatDuration(data.avgDuration)}</div>
      <div class="an-kpi-card-lbl">Avg Duration</div>
    </div>
    <div class="an-kpi-card">
      <div class="an-kpi-card-val display">${data.bounceRate}%</div>
      <div class="an-kpi-card-lbl">Bounce Rate</div>
    </div>
  </div>`;
}

function trafficToPoints(data: TrafficTrends) {
  return data.data.map(d => ({
    period: d.period,
    value: d.views,
    tooltip: `${d.period}: ${d.views} views, ${d.uniqueVisitors} visitors`,
  }));
}

function renderTrafficTrends(data: TrafficTrends): string {
  const total = data.data.reduce((s, d) => s + d.views, 0);
  const chart = renderTrendChart(trafficToPoints(data));

  return `
  <div class="an-section">
    <div class="an-section-label">Traffic Over Time</div>
    <div class="an-card an-card-full">
      <div class="an-card-header">
        <h3 class="an-card-title">Page Views</h3>
        <div class="an-card-header-r">
          <span class="an-card-stat">${total.toLocaleString()} total</span>
          <div class="an-gran-btns">
            <button class="tf-gran active" data-gran="day">Day</button>
            <button class="tf-gran" data-gran="week">Week</button>
            <button class="tf-gran" data-gran="month">Month</button>
          </div>
        </div>
      </div>
      <div id="traffic-trend-area">${chart}</div>
    </div>
  </div>`;
}

function renderTopPages(data: TrafficOverview): string {
  return `
  <div class="an-section">
    <div class="an-section-label">Top Pages</div>
    <div class="an-card an-card-full">
      <h3 class="an-card-title">Most Visited <span class="an-card-badge">${data.topPages.length} pages</span></h3>
      ${barChart(data.topPages.map(p => ({
        label: pageName(p._id),
        value: p.count,
      })))}
    </div>
  </div>`;
}

function renderFormFunnel(data: FormFunnelData): string {
  const stepOrder = ['profile_selected', 'form_start', 'form_step_complete', 'form_submitted'];
  const stepLabels: Record<string, string> = {
    profile_selected: 'Profile Selected',
    form_start: 'Form Started',
    form_step_complete: 'Steps Completed',
    form_submitted: 'Submitted',
  };

  const steps = stepOrder
    .map(action => {
      const match = data.steps.find(s => s._id === action);
      return { label: stepLabels[action] || action, value: match?.count || 0 };
    })
    .filter(s => s.value > 0);

  if (!steps.length) {
    return `
    <div class="an-section">
      <div class="an-section-label">Form Conversion Funnel</div>
      <div class="an-card an-card-full">
        <p class="an-empty">No form funnel data yet. Data will appear as visitors use the registration form.</p>
      </div>
    </div>`;
  }

  const max = Math.max(steps[0]?.value || 1, 1);
  return `
  <div class="an-section">
    <div class="an-section-label">Form Conversion Funnel</div>
    <div class="an-card an-card-full">
      <h3 class="an-card-title">Registration Journey</h3>
      <div class="funnel-chart">
        ${steps.map((s, i) => {
          const pct = Math.round((s.value / max) * 100);
          const dropoff = i > 0 ? Math.round(((steps[i - 1].value - s.value) / steps[i - 1].value) * 100) : 0;
          const color = i === steps.length - 1 ? 'var(--green)' : 'var(--gold)';
          return `
          <div class="funnel-step">
            <div class="funnel-bar" style="width:${Math.max(pct, 8)}%;background:${color}">
              <span class="funnel-val">${s.value}</span>
            </div>
            <div class="funnel-lbl">${s.label}</div>
            <div class="funnel-pct">${pct}%${i > 0 ? ` <span class="tf-dropoff">-${dropoff}%</span>` : ''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function renderSources(data: ReferrerData): string {
  return `
  <div class="an-section">
    <div class="an-section-label">Traffic Sources</div>
    <div class="an-section-row">
      <div class="an-card">
        <h3 class="an-card-title">Referrer Domains</h3>
        ${barChart(data.referrers.map(r => ({ label: r._id || 'Direct', value: r.count, color: '#7ab8e8' })))}
      </div>
      <div class="an-card">
        <h3 class="an-card-title">UTM Sources</h3>
        ${barChart(data.utmSources.map(s => ({ label: s._id, value: s.count, color: '#4cb87a' })))}
      </div>
    </div>
  </div>`;
}

function renderDevices(data: DeviceData): string {
  return `
  <div class="an-section">
    <div class="an-section-label">Device & Browser</div>
    <div class="an-section-triple">
      <div class="an-card">
        <h3 class="an-card-title">Device Type</h3>
        ${barChart(data.byDeviceType.map(d => ({
          label: (d._id || 'desktop').charAt(0).toUpperCase() + (d._id || 'desktop').slice(1),
          value: d.count,
          color: '#c9a84c',
        })))}
      </div>
      <div class="an-card">
        <h3 class="an-card-title">Browser</h3>
        ${barChart(data.byBrowser.map(b => ({ label: b._id || 'Unknown', value: b.count, color: '#7ab8e8' })))}
      </div>
      <div class="an-card">
        <h3 class="an-card-title">Operating System</h3>
        ${barChart(data.byOS.map(o => ({ label: o._id || 'Unknown', value: o.count, color: '#4cb87a' })))}
      </div>
    </div>
  </div>`;
}

function renderHeatmap(data: HourlyData): string {
  const dayLabels = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const max = Math.max(...data.data.map(d => d.count), 1);

  // Build 7x24 grid
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  data.data.forEach(d => {
    const dayIdx = d._id.day - 1; // MongoDB dayOfWeek is 1-7 (Sun-Sat)
    grid[dayIdx][d._id.hour] = d.count;
  });

  if (!data.data.length) {
    return `
    <div class="an-section">
      <div class="an-section-label">Peak Hours</div>
      <div class="an-card an-card-full">
        <p class="an-empty">No hourly data yet. Check back after more visitors.</p>
      </div>
    </div>`;
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return `
  <div class="an-section">
    <div class="an-section-label">Peak Hours</div>
    <div class="an-card an-card-full">
      <h3 class="an-card-title">Traffic Heatmap <span class="an-card-badge">SAST</span></h3>
      <div class="heatmap-wrap">
        <div class="heatmap-grid">
          <div class="heatmap-corner"></div>
          ${hours.map(h => `<div class="heatmap-hour-label">${String(h).padStart(2, '0')}</div>`).join('')}
          ${grid.map((row, dayIdx) => `
            <div class="heatmap-day-label">${dayLabels[dayIdx + 1] || ''}</div>
            ${row.map(count => {
              const intensity = count > 0 ? Math.max(0.15, count / max) : 0;
              return `<div class="heatmap-cell" style="background:rgba(201,168,76,${intensity})" title="${count} views"></div>`;
            }).join('')}
          `).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function renderClicks(data: ClickData): string {
  return `
  <div class="an-section">
    <div class="an-section-label">Top Interactions</div>
    <div class="an-card an-card-full">
      <h3 class="an-card-title">Most Clicked CTAs</h3>
      ${barChart(data.clicks.map(c => ({ label: c._id, value: c.count, color: 'var(--gold)' })))}
    </div>
  </div>`;
}

// ── Page ──

let currentRange = '30d';
let cleanupFns: (() => void)[] = [];

export const trafficPage: Page = {
  render() {
    return `
    <div class="analytics-page traffic-page">
      <div class="analytics-header">
        <div>
          <h2 class="admin-main-title">Site Traffic</h2>
          <p class="an-header-sub">Visitor analytics, page views, and engagement tracking.</p>
        </div>
        <div class="an-range-btns">
          <button class="an-range" data-range="7d">7D</button>
          <button class="an-range active" data-range="30d">30D</button>
          <button class="an-range" data-range="90d">90D</button>
          <button class="an-range" data-range="1y">1Y</button>
        </div>
      </div>
      <div id="traffic-content"><p class="loading-state">Loading traffic data...</p></div>
    </div>`;
  },

  mount() {
    mountAdminLayout();
    cleanupFns = [];
    currentRange = '30d';
    loadTraffic();

    document.querySelectorAll('.an-range').forEach(btn => {
      const handler = (e: Event) => {
        currentRange = (e.currentTarget as HTMLButtonElement).dataset.range || '30d';
        document.querySelectorAll('.an-range').forEach(b => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        loadTraffic();
      };
      btn.addEventListener('click', handler);
      cleanupFns.push(() => btn.removeEventListener('click', handler));
    });
  },

  unmount() {
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];
  },
};

async function loadTraffic(): Promise<void> {
  const container = document.getElementById('traffic-content');
  if (!container) return;

  container.innerHTML = '<p class="loading-state">Loading traffic data...</p>';

  const [overviewRes, trendsRes, referrerRes, deviceRes, hoursRes, funnelRes, clickRes] = await Promise.all([
    api.getTrafficOverview(currentRange),
    api.getTrafficTrends('day', currentRange),
    api.getTrafficReferrers(currentRange),
    api.getTrafficDevices(currentRange),
    api.getTrafficHours(currentRange),
    api.getTrafficFormFunnel(currentRange),
    api.getTrafficClicks(currentRange),
  ]);

  let html = '';

  if (overviewRes.success && overviewRes.data) html += renderKPIs(overviewRes.data);
  if (trendsRes.success && trendsRes.data) html += renderTrafficTrends(trendsRes.data);
  if (overviewRes.success && overviewRes.data) html += renderTopPages(overviewRes.data);
  if (funnelRes.success && funnelRes.data) html += renderFormFunnel(funnelRes.data);
  if (referrerRes.success && referrerRes.data) html += renderSources(referrerRes.data);
  if (deviceRes.success && deviceRes.data) html += renderDevices(deviceRes.data);
  if (hoursRes.success && hoursRes.data) html += renderHeatmap(hoursRes.data);
  if (clickRes.success && clickRes.data) html += renderClicks(clickRes.data);

  if (!html) {
    html = '<p class="empty-state">No traffic data available. Page views will appear as visitors browse the site.</p>';
  }

  container.innerHTML = html;

  // Granularity toggle for trends
  document.querySelectorAll('.tf-gran').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const gran = (e.currentTarget as HTMLButtonElement).dataset.gran || 'day';
      document.querySelectorAll('.tf-gran').forEach(b => b.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');

      const area = document.getElementById('traffic-trend-area');
      if (!area) return;
      area.innerHTML = '<p class="loading-state" style="padding:var(--sp-8) 0">Loading...</p>';

      const res = await api.getTrafficTrends(gran, currentRange);
      if (res.success && res.data) {
        const total = res.data.data.reduce((s, d) => s + d.views, 0);
        area.innerHTML = renderTrendChart(trafficToPoints(res.data));
        const statEl = area.closest('.an-card')?.querySelector('.an-card-stat');
        if (statEl) statEl.textContent = `${total.toLocaleString()} total`;
      }
    });
  });
}
