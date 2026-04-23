import type { Page, RouteConfig } from './types/index.ts';
import { authGuard, verifySession } from './auth.ts';
import { tracker } from './services/tracker.ts';

// Public pages — eagerly loaded (small, always needed)
import { heroPage } from './pages/public/hero.ts';
import { gatewayPage } from './pages/public/gateway.ts';
import { formPage } from './pages/public/form.ts';
import { successPage } from './pages/public/success.ts';
import { aboutPage } from './pages/public/about.ts';
import { menteeMeterPage } from './pages/public/mentee-meter.ts';
import { landingPage } from './pages/public/landing.ts';
import { statusPage } from './pages/public/status.ts';
import { loginPage } from './pages/admin/login.ts';

// Admin pages — lazy loaded (only fetched when authenticated)
const lazy = (loader: () => Promise<Record<string, Page>>, key: string) =>
  async (): Promise<Page> => (await loader())[key];

import { renderNav, mountNav } from './components/nav.ts';
import { renderAdminLayout, mountAdminLayout, resetLayoutMount } from './pages/admin/layout.ts';

const routes: RouteConfig[] = [
  // Public
  { path: '/',              page: () => heroPage,        layout: 'public' },
  { path: '/gateway',       page: () => gatewayPage,     layout: 'public' },
  { path: '/register',      page: () => formPage,        layout: 'public' },
  { path: '/about',         page: () => aboutPage,       layout: 'public' },
  { path: '/success',       page: () => successPage,     layout: 'public' },
  { path: '/mentee-meter',  page: () => menteeMeterPage, layout: 'public' },
  { path: '/landing',       page: () => landingPage,     layout: 'public' },
  { path: '/status',        page: () => statusPage,      layout: 'public' },
  { path: '/admin/login',   page: () => loginPage,       layout: 'public' },
  // Admin — lazy loaded
  { path: '/admin/dashboard', page: lazy(() => import('./pages/admin/dashboard.ts'), 'dashboardPage'),      layout: 'admin', guard: authGuard },
  { path: '/admin/leads',     page: lazy(() => import('./pages/admin/leads.ts'), 'leadsPage'),              layout: 'admin', guard: authGuard },
  { path: '/admin/analytics', page: lazy(() => import('./pages/admin/analytics.ts'), 'analyticsPage'),      layout: 'admin', guard: authGuard },
  { path: '/admin/reports',   page: lazy(() => import('./pages/admin/reports.ts'), 'reportsPage'),          layout: 'admin', guard: authGuard },
  { path: '/admin/deal-room', page: lazy(() => import('./pages/admin/deal-room.ts'), 'dealRoomPage'),       layout: 'admin', guard: authGuard },
  { path: '/admin/audit-log', page: lazy(() => import('./pages/admin/audit-log.ts'), 'auditLogPage'),       layout: 'admin', guard: authGuard },
  { path: '/admin/qr',        page: lazy(() => import('./pages/admin/qr-generator.ts'), 'qrGeneratorPage'), layout: 'admin', guard: authGuard },
  { path: '/admin/guide',     page: lazy(() => import('./pages/admin/guide.ts'), 'guidePage'),              layout: 'admin', guard: authGuard },
  { path: '/admin/polls',     page: lazy(() => import('./pages/admin/polls.ts'), 'pollsPage'),              layout: 'admin', guard: authGuard },
  { path: '/admin/traffic',   page: lazy(() => import('./pages/admin/traffic.ts'), 'trafficPage'),             layout: 'admin', guard: authGuard },
  { path: '/admin/settings',  page: lazy(() => import('./pages/admin/settings.ts'), 'settingsPage'),          layout: 'admin', guard: authGuard },
  { path: '/admin/admins',   page: lazy(() => import('./pages/admin/admins.ts'), 'adminsPage'),            layout: 'admin', guard: authGuard },
];

let currentPage: Page | null = null;

function getHash(): string {
  return window.location.hash.slice(1) || '/';
}

function matchRoute(path: string): RouteConfig | undefined {
  return routes.find(r => r.path === path);
}

async function render(): Promise<void> {
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

  if (route.guard) {
    if (!route.guard()) {
      navigate('/admin/login');
      return;
    }
    // Verify token is still valid with the backend before loading admin pages
    const valid = await verifySession();
    if (!valid) {
      navigate('/admin/login');
      return;
    }
  }

  if (currentPage?.unmount) currentPage.unmount();
  resetLayoutMount();

  const app = document.getElementById('app');
  if (!app) return;

  try {
    // Resolve page (may be async for lazy-loaded admin pages)
    const page = await route.page();
    currentPage = page;

    if (route.layout === 'admin') {
      app.innerHTML = renderAdminLayout(page.render(), path);
      mountAdminLayout();
    } else {
      const showNav = path !== '/admin/login' && path !== '/landing';
      app.innerHTML = (showNav ? renderNav(path) : '') + `<main>${page.render()}</main>`;
      if (showNav) mountNav();
    }

    if (page.mount) page.mount();

    // Track page view (fire-and-forget)
    tracker.trackPageView(path);
  } catch (err) {
    console.error('Page render error:', err);
    app.innerHTML = `
      <section class="success-view">
        <div class="success-bg" aria-hidden="true"></div>
        <div class="success-wrap" style="text-align:center">
          <div class="success-ico fade-in" style="background:rgba(201,76,76,0.1);border-color:rgba(201,76,76,0.4);color:var(--red)">!</div>
          <h2 class="success-h display">Something Went Wrong</h2>
          <p class="success-p">This page encountered an error. Please try refreshing.</p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
            <button class="btn-primary" onclick="location.reload()">Refresh Page</button>
            <a class="btn-ghost" href="#/">Go Home</a>
          </div>
        </div>
      </section>`;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export const router = {
  init(): void {
    window.addEventListener('hashchange', () => render());
    render();
  },
};
