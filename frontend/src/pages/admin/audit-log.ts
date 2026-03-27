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
  timestamp: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  application: 'var(--gold)',
  admin: '#7ab8e8',
  auth: '#e8a47a',
  report: '#4cb87a',
  system: 'var(--steel)',
};

function formatTime(ts: string): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

function renderEvent(ev: AuditEvent): string {
  const color = CATEGORY_COLORS[ev.category] || 'var(--steel)';
  const actor = ev.actor?.email || ev.actor?.type || 'system';
  const ref = ev.target?.refNumber ? `<span class="audit-ref">${ev.target.refNumber}</span>` : '';
  const meta = ev.meta ? Object.entries(ev.meta)
    .filter(([k]) => !['filters', 'resultCount'].includes(k))
    .slice(0, 3)
    .map(([k, v]) => `<span class="audit-meta-item">${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}</span>`)
    .join('') : '';

  return `
  <div class="audit-row">
    <div class="audit-time">${formatTime(ev.timestamp)}</div>
    <div class="audit-dot" style="background:${color}"></div>
    <div class="audit-body">
      <div class="audit-event">
        <span class="audit-event-name">${ev.event}</span>
        <span class="audit-cat" style="color:${color}">${ev.category}</span>
        ${ref}
      </div>
      <div class="audit-actor">${actor}</div>
      ${meta ? `<div class="audit-meta">${meta}</div>` : ''}
    </div>
  </div>`;
}

let currentPage = 1;
let currentCategory = '';

async function loadEvents(): Promise<void> {
  const container = document.getElementById('audit-content');
  if (!container) return;

  container.innerHTML = '<p class="loading-state">Loading events...</p>';

  const params = new URLSearchParams();
  params.set('page', String(currentPage));
  params.set('limit', '30');
  if (currentCategory) params.set('category', currentCategory);

  const res = await api.getAuditLog(params.toString());

  if (!res.success) {
    container.innerHTML = '<p class="empty-state">Failed to load audit log.</p>';
    return;
  }

  const events = (res.data ?? []) as AuditEvent[];
  const pagination = res.pagination;

  if (!events.length) {
    container.innerHTML = '<p class="empty-state">No events recorded yet.</p>';
    return;
  }

  const paginationHtml = pagination ? `
    <div class="audit-pagination">
      <span class="audit-page-info">Page ${pagination.page} of ${pagination.pages} (${pagination.total} events)</span>
      <div class="audit-page-btns">
        ${pagination.page > 1 ? `<button class="btn-action" id="audit-prev">← Prev</button>` : ''}
        ${pagination.page < pagination.pages ? `<button class="btn-action" id="audit-next">Next →</button>` : ''}
      </div>
    </div>` : '';

  container.innerHTML = `
    <div class="audit-timeline">${events.map(renderEvent).join('')}</div>
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
          <p class="audit-header-sub">Activity timeline and event tracking.</p>
        </div>
      </div>
      <div class="audit-filters">
        <button class="ft active" data-cat="">All</button>
        <button class="ft" data-cat="application">Application</button>
        <button class="ft" data-cat="admin">Admin</button>
        <button class="ft" data-cat="auth">Auth</button>
        <button class="ft" data-cat="report">Report</button>
      </div>
      <div id="audit-content"><p class="loading-state">Loading...</p></div>
    </div>`;
  },

  mount() {
    mountAdminLayout();
    currentPage = 1;
    currentCategory = '';
    loadEvents();

    document.querySelectorAll('.audit-filters .ft').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentCategory = (e.currentTarget as HTMLButtonElement).dataset.cat || '';
        currentPage = 1;
        document.querySelectorAll('.audit-filters .ft').forEach(b => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        loadEvents();
      });
    });
  },
};
