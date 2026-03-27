import type { Page, RouteConfig } from './types/index.ts';
import { authGuard } from './auth.ts';

// Page imports (lazy — filled in after pages are created)
import { heroPage } from './pages/public/hero.ts';
import { gatewayPage } from './pages/public/gateway.ts';
import { formPage } from './pages/public/form.ts';
import { successPage } from './pages/public/success.ts';
import { loginPage } from './pages/admin/login.ts';
import { dashboardPage } from './pages/admin/dashboard.ts';
import { leadsPage } from './pages/admin/leads.ts';
import { reportsPage } from './pages/admin/reports.ts';
import { dealRoomPage } from './pages/admin/deal-room.ts';
import { renderNav } from './components/nav.ts';
import { renderAdminLayout, mountAdminLayout } from './pages/admin/layout.ts';

const routes: RouteConfig[] = [
  { path: '/',                page: () => heroPage,      layout: 'public' },
  { path: '/gateway',         page: () => gatewayPage,   layout: 'public' },
  { path: '/register',        page: () => formPage,      layout: 'public' },
  { path: '/success',         page: () => successPage,   layout: 'public' },
  { path: '/admin/login',     page: () => loginPage,     layout: 'public' },
  { path: '/admin/dashboard', page: () => dashboardPage, layout: 'admin', guard: authGuard },
  { path: '/admin/leads',     page: () => leadsPage,     layout: 'admin', guard: authGuard },
  { path: '/admin/reports',   page: () => reportsPage,   layout: 'admin', guard: authGuard },
  { path: '/admin/deal-room', page: () => dealRoomPage,  layout: 'admin', guard: authGuard },
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
    navigate('/');
    return;
  }

  // Auth guard
  if (route.guard && !route.guard()) {
    navigate('/admin/login');
    return;
  }

  // Cleanup previous page
  if (currentPage?.unmount) currentPage.unmount();

  const app = document.getElementById('app');
  if (!app) return;
  const page = route.page();
  currentPage = page;

  if (route.layout === 'admin') {
    app.innerHTML = renderAdminLayout(page.render(), path);
    mountAdminLayout();
  } else {
    const showNav = path !== '/admin/login';
    app.innerHTML = (showNav ? renderNav(path) : '') + `<main>${page.render()}</main>`;
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
