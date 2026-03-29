import type { Page } from '../../types/index.ts';
import { api } from '../../api.ts';
import { mountAdminLayout } from './layout.ts';

interface AuditEvent {
  _id: string;
  event: string;
  category: string;
  actor: { type: string; id?: string; email?: string };
  target?: { model?: string; id?: string; refNumber?: string };
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  application: 'var(--gold)',
  admin: '#7ab8e8',
  auth: '#e8a47a',
  report: '#4cb87a',
  system: 'var(--steel)',
};

const CATEGORY_ICONS: Record<string, string> = {
  application: '&#9654;',
  admin: '&#9881;',
  auth: '&#9919;',
  report: '&#9670;',
  system: '&#9632;',
};

const EVENT_LABELS: Record<string, string> = {
  'application.submitted': 'New Application',
  'application.updated': 'Application Updated',
  'application.viewed': 'Application Viewed',
  'application.bulk_status': 'Bulk Status Change',
  'applications.listed': 'Leads Viewed',
  'stats.viewed': 'Dashboard Viewed',
  'export.csv': 'CSV Exported',
  'report.generated': 'Report Generated',
  'email.summit_reminder': 'Summit Reminder Sent',
};

function formatTime(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  let relative = '';
  if (diffMin < 1) relative = 'Just now';
  else if (diffMin < 60) relative = `${diffMin}m ago`;
  else if (diffHr < 24) relative = `${diffHr}h ago`;
  else relative = d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });

  const time = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `<span class="audit-time-rel">${relative}</span><span class="audit-time-abs">${time}</span>`;
}

function renderMetaDetails(meta: Record<string, unknown>): string {
  const items = Object.entries(meta)
    .filter(([k]) => !['filters', 'resultCount'].includes(k))
    .map(([k, v]) => {
      let display = '';
      if (typeof v === 'object' && v !== null) {
        if (Array.isArray(v)) {
          display = v.length > 3 ? `[${v.length} items]` : v.join(', ');
        } else {
          display = JSON.stringify(v);
        }
      } else {
        display = String(v);
      }
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      return `<div class="audit-detail"><span class="audit-detail-key">${label}</span><span class="audit-detail-val">${display}</span></div>`;
    });
  return items.length ? `<div class="audit-details">${items.join('')}</div>` : '';
}

function renderEvent(ev: AuditEvent): string {
  const color = CATEGORY_COLORS[ev.category] || 'var(--steel)';
  const icon = CATEGORY_ICONS[ev.category] || '&#9679;';
  const label = EVENT_LABELS[ev.event] || ev.event;
  const actor = ev.actor?.email || ev.actor?.type || 'system';
  const actorBadge = ev.actor?.type === 'admin'
    ? '<span class="audit-actor-badge admin">Admin</span>'
    : ev.actor?.type === 'applicant'
    ? '<span class="audit-actor-badge applicant">Applicant</span>'
    : '<span class="audit-actor-badge system">System</span>';
  const ref = ev.target?.refNumber ? `<span class="audit-ref">${ev.target.refNumber}</span>` : '';
  const meta = ev.meta ? renderMetaDetails(ev.meta) : '';
  const ipInfo = ev.ip ? `<span class="audit-ip" title="IP Address">${ev.ip}</span>` : '';

  return `
  <div class="audit-row" data-id="${ev._id}">
    <div class="audit-time-col">${formatTime(ev.timestamp)}</div>
    <div class="audit-icon-col">
      <div class="audit-icon" style="background:${color}20;color:${color}">${icon}</div>
    </div>
    <div class="audit-body">
      <div class="audit-event-row">
        <span class="audit-event-label">${label}</span>
        <span class="audit-cat-badge" style="background:${color}15;color:${color}">${ev.category}</span>
        ${ref}
      </div>
      <div class="audit-actor-row">
        ${actorBadge}
        <span class="audit-actor-email">${actor}</span>
        ${ipInfo}
      </div>
      ${meta}
    </div>
  </div>`;
}

function renderStats(events: AuditEvent[]): string {
  const cats: Record<string, number> = {};
  events.forEach(e => { cats[e.category] = (cats[e.category] || 0) + 1; });
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);

  return `
  <div class="audit-stats">
    ${sorted.map(([cat, count]) => {
      const color = CATEGORY_COLORS[cat] || 'var(--steel)';
      return `<div class="audit-stat">
        <div class="audit-stat-dot" style="background:${color}"></div>
        <span class="audit-stat-label">${cat}</span>
        <span class="audit-stat-count">${count}</span>
      </div>`;
    }).join('')}
    <div class="audit-stat">
      <span class="audit-stat-label" style="font-weight:600;color:var(--cream)">Total</span>
      <span class="audit-stat-count" style="color:var(--gold)">${events.length}</span>
    </div>
  </div>`;
}

let currentPage = 1;
let currentCategory = '';
let searchQuery = '';
let allPageEvents: AuditEvent[] = [];

async function loadEvents(): Promise<void> {
  const container = document.getElementById('audit-content');
  if (!container) return;

  container.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card" style="height:80px"></div>';

  const params = new URLSearchParams();
  params.set('page', String(currentPage));
  params.set('limit', '50');
  if (currentCategory) params.set('category', currentCategory);

  const res = await api.getAuditLog(params.toString());

  if (!res.success) {
    container.innerHTML = '<p class="detail-empty">Failed to load audit log.</p>';
    return;
  }

  const events = (res.data ?? []) as AuditEvent[];
  allPageEvents = events;
  const pagination = res.pagination;

  if (!events.length) {
    container.innerHTML = '<p class="detail-empty">No events recorded yet.</p>';
    return;
  }

  const filtered = searchQuery
    ? events.filter(e =>
        e.event.includes(searchQuery) ||
        e.actor?.email?.includes(searchQuery) ||
        e.target?.refNumber?.includes(searchQuery.toUpperCase()) ||
        JSON.stringify(e.meta || {}).includes(searchQuery)
      )
    : events;

  const paginationHtml = pagination ? `
    <div class="audit-pagination">
      <span class="audit-page-info">Page ${pagination.page} of ${pagination.pages} &middot; ${pagination.total} total events</span>
      <div class="audit-page-btns">
        ${pagination.page > 1 ? `<button class="btn-action" id="audit-prev">&#8592; Previous</button>` : ''}
        ${pagination.page < pagination.pages ? `<button class="btn-action" id="audit-next">Next &#8594;</button>` : ''}
      </div>
    </div>` : '';

  container.innerHTML = `
    ${renderStats(events)}
    ${filtered.length !== events.length ? `<p class="audit-filter-note">Showing ${filtered.length} of ${events.length} events on this page</p>` : ''}
    <div class="audit-timeline">${filtered.map(renderEvent).join('')}</div>
    ${paginationHtml}`;

  document.getElementById('audit-prev')?.addEventListener('click', () => { currentPage--; loadEvents(); });
  document.getElementById('audit-next')?.addEventListener('click', () => { currentPage++; loadEvents(); });
}

export const auditLogPage: Page = {
  render() {
    return `
    <div class="audit-page">
      <div class="audit-header">
        <div>
          <h2 class="admin-main-title">Audit Log</h2>
          <p class="audit-header-sub">Complete activity timeline — every action tracked and logged.</p>
        </div>
      </div>

      <div class="audit-controls">
        <div class="audit-search-wrap">
          <span class="tbl-search-icon" aria-hidden="true">&#9906;</span>
          <input id="audit-search" class="tbl-search" type="text" placeholder="Search events, emails, ref numbers..." />
        </div>
        <div class="audit-filters">
          <button class="ft active" data-cat="">All</button>
          <button class="ft" data-cat="application">Application</button>
          <button class="ft" data-cat="admin">Admin</button>
          <button class="ft" data-cat="auth">Auth</button>
          <button class="ft" data-cat="report">Report</button>
          <button class="ft" data-cat="system">System</button>
        </div>
      </div>

      <div id="audit-content">
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card" style="height:80px"></div>
      </div>
    </div>`;
  },

  mount() {
    mountAdminLayout();
    currentPage = 1;
    currentCategory = '';
    searchQuery = '';
    loadEvents();

    // Category filters
    document.querySelectorAll('.audit-filters .ft').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentCategory = (e.currentTarget as HTMLButtonElement).dataset.cat || '';
        currentPage = 1;
        document.querySelectorAll('.audit-filters .ft').forEach(b => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        loadEvents();
      });
    });

    // Search
    let searchTimer: ReturnType<typeof setTimeout>;
    document.getElementById('audit-search')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchQuery = (e.target as HTMLInputElement).value.trim().toLowerCase();
        // Client-side filter on current page results
        const container = document.getElementById('audit-content');
        if (!container || !allPageEvents.length) return;

        const filtered = searchQuery
          ? allPageEvents.filter(ev =>
              ev.event.includes(searchQuery) ||
              ev.actor?.email?.toLowerCase().includes(searchQuery) ||
              ev.target?.refNumber?.toLowerCase().includes(searchQuery) ||
              JSON.stringify(ev.meta || {}).toLowerCase().includes(searchQuery)
            )
          : allPageEvents;

        const timeline = container.querySelector('.audit-timeline');
        const note = container.querySelector('.audit-filter-note');
        if (timeline) timeline.innerHTML = filtered.map(renderEvent).join('');
        if (note) {
          (note as HTMLElement).textContent = filtered.length !== allPageEvents.length
            ? `Showing ${filtered.length} of ${allPageEvents.length} events on this page`
            : '';
        }
      }, 250);
    });
  },
};
