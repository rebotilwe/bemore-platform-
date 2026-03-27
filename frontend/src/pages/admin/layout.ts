import { logout } from '../../auth.ts';

interface SidebarItem {
  label: string;
  path: string;
  icon: string;
}

const sidebarItems: SidebarItem[] = [
  { label: 'Dashboard',  path: '/admin/dashboard', icon: '📊' },
  { label: 'All Leads',  path: '/admin/leads', icon: '📋' },
  { label: 'Reports',    path: '/admin/reports', icon: '📈' },
  { label: 'Deal Room',  path: '/admin/deal-room', icon: '🏠' },
];

export function renderAdminLayout(content: string, currentPath: string): string {
  const navItems = sidebarItems.map(item => {
    const active = currentPath === item.path ? ' active' : '';
    return `<a class="sb-item${active}" href="#${item.path}"><span class="sidebar-icon">${item.icon}</span>${item.label}</a>`;
  }).join('');

  return `
  <nav class="admin-nav">
    <div class="admin-brand">
      <span class="admin-brand-text display">BE<span>MORE</span></span>
    </div>
    <div class="admin-r">
      <span class="admin-user">Admin</span>
      <button class="btn-logout" id="admin-logout-btn">Logout</button>
    </div>
  </nav>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="sb-sec">
        <div class="sb-lbl">Main</div>
        ${navItems}
      </div>
    </aside>
    <section class="admin-main">${content}</section>
  </div>`;
}

/** Called after admin layout is rendered to bind the logout button */
export function mountAdminLayout(): void {
  document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
    logout();
  });
}
