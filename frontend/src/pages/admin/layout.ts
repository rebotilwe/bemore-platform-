import { logout } from '../../auth.ts';
import { store } from '../../store.ts';

interface SidebarItem {
  label: string;
  path: string;
  icon: string;
}

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

const sidebarSections: SidebarSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',  path: '/admin/dashboard', icon: '&#9632;' },
      { label: 'All Leads',  path: '/admin/leads', icon: '&#9776;' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Analytics',    path: '/admin/analytics', icon: '&#9650;' },
      { label: 'Site Traffic', path: '/admin/traffic', icon: '&#9672;' },
      { label: 'Reports',      path: '/admin/reports', icon: '&#9670;' },
      { label: 'Deal Room',    path: '/admin/deal-room', icon: '&#9733;' },
      { label: 'Mentee Meter', path: '/admin/polls', icon: '&#9879;' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Admins',    path: '/admin/admins', icon: '&#9780;' },
      { label: 'QR Codes',   path: '/admin/qr', icon: '&#9635;' },
      { label: 'Audit Log',  path: '/admin/audit-log', icon: '&#9201;' },
      { label: 'Settings',   path: '/admin/settings', icon: '&#9881;' },
      { label: 'Admin Guide', path: '/admin/guide', icon: '&#10067;' },
    ],
  },
];

export function renderAdminLayout(content: string, currentPath: string): string {
  const sidebarHtml = sidebarSections.map(section => {
    const items = section.items.map(item => {
      const active = currentPath === item.path ? ' active' : '';
      return `<a class="sb-item${active}" href="#${item.path}"><span class="sidebar-icon">${item.icon}</span>${item.label}</a>`;
    }).join('');
    return `<div class="sb-sec"><div class="sb-lbl">${section.label}</div>${items}</div>`;
  }).join('');

  return `
  <nav class="admin-nav">
    <div class="admin-brand">
      <button class="admin-burger" id="admin-burger" aria-label="Toggle sidebar">
        <span></span><span></span><span></span>
      </button>
      <img src="/be-more-group-logo.png" alt="BeMore Group" class="admin-brand-logo" />
      <span class="admin-brand-badge">Admin</span>
    </div>
    <div class="admin-r">
      <span class="admin-user">${store.get('adminEmail') || 'Admin'}</span>
      <button class="btn-logout" id="admin-logout-btn">Logout</button>
    </div>
  </nav>
  <div class="admin-layout">
    <aside class="admin-sidebar" id="admin-sidebar">
      ${sidebarHtml}
    </aside>
    <div class="admin-sidebar-overlay" id="admin-sidebar-overlay"></div>
    <section class="admin-main">${content}</section>
  </div>`;
}

let layoutMounted = false;

export function mountAdminLayout(): void {
  // Prevent duplicate event listeners when called by both router and page.mount()
  if (layoutMounted) return;
  layoutMounted = true;

  document.getElementById('admin-logout-btn')?.addEventListener('click', () => logout());

  const burger = document.getElementById('admin-burger');
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('admin-sidebar-overlay');

  if (!burger || !sidebar || !overlay) return;

  const toggle = () => {
    const open = sidebar.classList.toggle('open');
    burger.classList.toggle('open', open);
    overlay.classList.toggle('open', open);
  };

  const close = () => {
    sidebar.classList.remove('open');
    burger.classList.remove('open');
    overlay.classList.remove('open');
  };

  burger.addEventListener('click', toggle);
  overlay.addEventListener('click', close);

  // Close sidebar when nav link clicked (mobile)
  sidebar.querySelectorAll('.sb-item').forEach(item => {
    item.addEventListener('click', close);
  });
}

// Reset flag when navigating (called before re-rendering layout)
export function resetLayoutMount(): void {
  layoutMounted = false;
}
