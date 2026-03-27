import { logout } from '../../auth.ts';
import { store } from '../../store.ts';

interface SidebarItem {
  label: string;
  path: string;
  icon: string;
}

const sidebarItems: SidebarItem[] = [
  { label: 'Dashboard',  path: '/admin/dashboard', icon: '&#9632;' },
  { label: 'All Leads',  path: '/admin/leads', icon: '&#9776;' },
  { label: 'Analytics',  path: '/admin/analytics', icon: '&#9650;' },
  { label: 'Reports',    path: '/admin/reports', icon: '&#9670;' },
  { label: 'Deal Room',  path: '/admin/deal-room', icon: '&#9733;' },
];

export function renderAdminLayout(content: string, currentPath: string): string {
  const navItems = sidebarItems.map(item => {
    const active = currentPath === item.path ? ' active' : '';
    return `<a class="sb-item${active}" href="#${item.path}"><span class="sidebar-icon">${item.icon}</span>${item.label}</a>`;
  }).join('');

  return `
  <nav class="admin-nav">
    <div class="admin-brand">
      <button class="admin-burger" id="admin-burger" aria-label="Toggle sidebar">
        <span></span><span></span><span></span>
      </button>
      <span class="admin-brand-text display">BE<span>MORE</span></span>
    </div>
    <div class="admin-r">
      <span class="admin-user">${store.get('adminEmail') || 'Admin'}</span>
      <button class="btn-logout" id="admin-logout-btn">Logout</button>
    </div>
  </nav>
  <div class="admin-layout">
    <aside class="admin-sidebar" id="admin-sidebar">
      <div class="sb-sec">
        <div class="sb-lbl">Main</div>
        ${navItems}
      </div>
    </aside>
    <div class="admin-sidebar-overlay" id="admin-sidebar-overlay"></div>
    <section class="admin-main">${content}</section>
  </div>`;
}

export function mountAdminLayout(): void {
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
