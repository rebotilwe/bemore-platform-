import type { Page, RouteConfig } from './types/index.ts';
import { authGuard } from './auth.ts';

// Page imports (lazy — filled in after pages are created)
import { heroPage } from './pages/public/hero.ts';
import { gatewayPage } from './pages/public/gateway.ts';
import { formPage } from './pages/public/form.ts';
import { successPage } from './pages/public/success.ts';
import { aboutPage } from './pages/public/about.ts';
import { menteeMeterPage } from './pages/public/mentee-meter.ts';
import { landingPage } from './pages/public/landing.ts';
import { statusPage } from './pages/public/status.ts';
import { loginPage } from './pages/admin/login.ts';
import { dashboardPage } from './pages/admin/dashboard.ts';
import { leadsPage } from './pages/admin/leads.ts';
import { reportsPage } from './pages/admin/reports.ts';
import { dealRoomPage } from './pages/admin/deal-room.ts';
import { analyticsPage } from './pages/admin/analytics.ts';
import { auditLogPage } from './pages/admin/audit-log.ts';
import { qrGeneratorPage } from './pages/admin/qr-generator.ts';
import { guidePage } from './pages/admin/guide.ts';
import { pollsPage } from './pages/admin/polls.ts';
import { renderNav, mountNav } from './components/nav.ts';
import { renderAdminLayout, mountAdminLayout, resetLayoutMount } from './pages/admin/layout.ts';

const routes: RouteConfig[] = [
  { path: '/',                page: () => heroPage,      layout: 'public' },
  { path: '/gateway',         page: () => gatewayPage,   layout: 'public' },
  { path: '/register',        page: () => formPage,      layout: 'public' },
  { path: '/about',            page: () => aboutPage,     layout: 'public' },
  { path: '/success',         page: () => successPage,   layout: 'public' },
  { path: '/mentee-meter',    page: () => menteeMeterPage, layout: 'public' },
  { path: '/landing',         page: () => landingPage,     layout: 'public' },
  { path: '/status',          page: () => statusPage,      layout: 'public' },
  { path: '/admin/login',     page: () => loginPage,     layout: 'public' },
  { path: '/admin/dashboard', page: () => dashboardPage, layout: 'admin', guard: authGuard },
  { path: '/admin/leads',     page: () => leadsPage,     layout: 'admin', guard: authGuard },
  { path: '/admin/analytics',  page: () => analyticsPage,  layout: 'admin', guard: authGuard },
  { path: '/admin/reports',   page: () => reportsPage,   layout: 'admin', guard: authGuard },
  { path: '/admin/deal-room', page: () => dealRoomPage,  layout: 'admin', guard: authGuard },
  { path: '/admin/audit-log', page: () => auditLogPage,  layout: 'admin', guard: authGuard },
  { path: '/admin/qr',        page: () => qrGeneratorPage, layout: 'admin', guard: authGuard },
  { path: '/admin/guide',     page: () => guidePage,        layout: 'admin', guard: authGuard },
  { path: '/admin/polls',    page: () => pollsPage,        layout: 'admin', guard: authGuard },
];

let currentPage: Page | null = null;

function getHash(): string {
  const hash = window.location.hash.slice(1) || '/';
  return hash;
}

function matchRoute(path: string): RouteConfig | undefined {
  return routes.find(r => r.path === path);
}

function render(): void {
  const path = getHash();
  const route = matchRoute(path);

  if (!route) {
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <section class="success-view">
          <div class="success-bg" aria-hidden="true"></div>
          <div class="success-wrap" style="text-align:center">
            <div class="success-ico fade-in" style="background:rgba(201,168,76,0.1);border-color:rgba(201,168,76,0.4);color:var(--gold)">?</div>
            <h2 class="success-h display fade-up stagger-1">Page Not Found</h2>
            <p class="success-p fade-up stagger-2">The page you're looking for doesn't exist or has moved.</p>
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap" class="fade-up stagger-3">
              <a class="btn-primary" href="#/">Go Home</a>
              <a class="btn-ghost" href="#/gateway">Apply Now</a>
              <a class="btn-ghost" href="#/status">Check Status</a>
            </div>
          </div>
        </section>`;
    }
    return;
  }

  // Auth guard
  if (route.guard && !route.guard()) {
    navigate('/admin/login');
    return;
  }

  // Cleanup previous page
  if (currentPage?.unmount) currentPage.unmount();
  resetLayoutMount();

  const app = document.getElementById('app');
  if (!app) return;
  const page = route.page();
  currentPage = page;

  if (route.layout === 'admin') {
    app.innerHTML = renderAdminLayout(page.render(), path);
    mountAdminLayout();
  } else {
    const showNav = path !== '/admin/login' && path !== '/landing';
    app.innerHTML = (showNav ? renderNav(path) : '') + `<main>${page.render()}</main>`;
    if (showNav) mountNav();
  }

  // Mount page event listeners
  if (page.mount) page.mount();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export const router = {
  init(): void {
    window.addEventListener('hashchange', render);
    render();
  },
};
