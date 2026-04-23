import type { Page } from '../../types/index.ts';
import { api } from '../../api.ts';
import { store } from '../../store.ts';
import { mountAdminLayout } from './layout.ts';
import { toast } from '../../components/toast.ts';
import { esc } from '../../utils/format.ts';

interface AdminUser {
  _id: string;
  email: string;
  name: string;
  createdAt: string;
}

function getInitials(name: string, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export const adminsPage: Page = {
  render() {
    return `
    <div class="settings-page">
      <div class="settings-header">
        <h2 class="admin-main-title">Admin Users</h2>
        <p class="settings-header-sub">Manage who has access to the admin dashboard.</p>
      </div>

      <div id="admins-content">
        <div class="skeleton skeleton-card"></div>
      </div>

      <dialog id="admin-dialog" class="admin-dialog">
        <div class="admin-dialog-card">
          <div class="admin-dialog-header">
            <h3 class="admin-dialog-title" id="admin-dialog-title">Add Admin User</h3>
            <button class="admin-dialog-close" id="admin-dialog-close" aria-label="Close">&times;</button>
          </div>
          <form id="admin-form">
            <input type="hidden" id="admin-id" />
            <div class="admin-form-group">
              <label for="admin-email" class="admin-form-label">Email</label>
              <input type="email" id="admin-email" class="admin-form-input" placeholder="admin@example.co.za" required />
            </div>
            <div class="admin-form-group">
              <label for="admin-name" class="admin-form-label">Name</label>
              <input type="text" id="admin-name" class="admin-form-input" placeholder="Full name (optional)" />
            </div>
            <div class="admin-form-group" id="password-group">
              <label for="admin-password" class="admin-form-label">Password</label>
              <input type="password" id="admin-password" class="admin-form-input" placeholder="Minimum 8 characters" minlength="8" />
              <span class="admin-form-hint" id="password-hint">Minimum 8 characters</span>
            </div>
            <div class="admin-dialog-actions">
              <button type="button" class="btn-ghost" id="admin-dialog-cancel">Cancel</button>
              <button type="submit" class="btn-primary" id="admin-submit-btn">Create Admin</button>
            </div>
          </form>
        </div>
      </dialog>

      <dialog id="delete-dialog" class="admin-dialog">
        <div class="admin-dialog-card">
          <div class="admin-dialog-header">
            <h3 class="admin-dialog-title">Delete Admin</h3>
            <button class="admin-dialog-close" id="delete-dialog-close" aria-label="Close">&times;</button>
          </div>
          <div class="admin-delete-body">
            <p>This will permanently remove admin access for:</p>
            <div class="admin-delete-email" id="delete-email-display"></div>
          </div>
          <input type="hidden" id="delete-admin-id" />
          <div class="admin-dialog-actions">
            <button type="button" class="btn-ghost" id="delete-dialog-cancel">Cancel</button>
            <button type="button" class="btn-danger" id="delete-confirm-btn">Delete Admin</button>
          </div>
        </div>
      </dialog>
    </div>`;
  },

  async mount() {
    mountAdminLayout();

    const container = document.getElementById('admins-content');
    const adminDialog = document.getElementById('admin-dialog') as HTMLDialogElement;
    const deleteDialog = document.getElementById('delete-dialog') as HTMLDialogElement;
    if (!container || !adminDialog || !deleteDialog) return;

    const currentEmail = store.get('adminEmail') || '';
    let admins: AdminUser[] = [];

    async function loadAdmins() {
      const res = await api.getAdmins();
      admins = (res.success && Array.isArray(res.data) ? res.data : []) as AdminUser[];
      renderAdmins();
    }

    function renderAdmins() {
      if (!container) return;
      if (admins.length === 0) {
        container.innerHTML = `
          <div class="admins-empty">
            <div class="admins-empty-icon">&#9780;</div>
            <h3 class="admins-empty-title">No Admin Users</h3>
            <p class="admins-empty-sub">Add an admin to enable dashboard access.</p>
          </div>`;
        return;
      }

      container.innerHTML = `
        <div class="admins-header-row">
          <span class="admins-count">${admins.length} admin${admins.length !== 1 ? 's' : ''}</span>
          <button class="btn-primary" id="add-admin-btn">+ Add Admin</button>
        </div>
        <div class="admins-list">
          ${admins.map(admin => {
            const isYou = admin.email === currentEmail;
            const initials = getInitials(admin.name, admin.email);
            const date = new Date(admin.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
            return `
            <div class="admin-card" data-id="${admin._id}">
              <div class="admin-card-left">
                <div class="admin-card-avatar">${esc(initials)}</div>
                <div class="admin-card-info">
                  <div class="admin-card-email">${esc(admin.email)}${isYou ? '<span class="admin-card-you">You</span>' : ''}</div>
                  <div class="admin-card-name">${esc(admin.name || 'No name set')}</div>
                  <div class="admin-card-date">Added ${date}</div>
                </div>
              </div>
              <div class="admin-card-actions">
                <button class="btn-sm btn-ghost edit-admin-btn" data-id="${admin._id}">Edit</button>
                ${!isYou ? `<button class="btn-sm btn-danger delete-admin-btn" data-id="${admin._id}">Delete</button>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>`;

      // Attach events
      document.getElementById('add-admin-btn')?.addEventListener('click', openAddModal);

      container.querySelectorAll('.edit-admin-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal((btn as HTMLElement).dataset.id!));
      });

      container.querySelectorAll('.delete-admin-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal((btn as HTMLElement).dataset.id!));
      });
    }

    function openAddModal() {
      (document.getElementById('admin-id') as HTMLInputElement).value = '';
      (document.getElementById('admin-email') as HTMLInputElement).value = '';
      (document.getElementById('admin-name') as HTMLInputElement).value = '';
      (document.getElementById('admin-password') as HTMLInputElement).value = '';
      (document.getElementById('admin-dialog-title') as HTMLElement).textContent = 'Add Admin User';
      (document.getElementById('admin-submit-btn') as HTMLElement).textContent = 'Create Admin';
      (document.getElementById('admin-password') as HTMLInputElement).required = true;
      (document.getElementById('password-hint') as HTMLElement).textContent = 'Minimum 8 characters';
      adminDialog.showModal();
    }

    function openEditModal(id: string) {
      const admin = admins.find(a => a._id === id);
      if (!admin) return;
      (document.getElementById('admin-id') as HTMLInputElement).value = id;
      (document.getElementById('admin-email') as HTMLInputElement).value = admin.email;
      (document.getElementById('admin-name') as HTMLInputElement).value = admin.name || '';
      (document.getElementById('admin-password') as HTMLInputElement).value = '';
      (document.getElementById('admin-dialog-title') as HTMLElement).textContent = 'Edit Admin User';
      (document.getElementById('admin-submit-btn') as HTMLElement).textContent = 'Save Changes';
      (document.getElementById('admin-password') as HTMLInputElement).required = false;
      (document.getElementById('password-hint') as HTMLElement).textContent = 'Leave blank to keep current password';
      adminDialog.showModal();
    }

    function openDeleteModal(id: string) {
      const admin = admins.find(a => a._id === id);
      if (!admin) return;
      (document.getElementById('delete-admin-id') as HTMLInputElement).value = id;
      const emailDisplay = document.getElementById('delete-email-display');
      if (emailDisplay) emailDisplay.textContent = admin.email;
      deleteDialog.showModal();
    }

    // Close handlers
    const closeAdmin = () => adminDialog.close();
    const closeDelete = () => deleteDialog.close();

    document.getElementById('admin-dialog-close')?.addEventListener('click', closeAdmin);
    document.getElementById('admin-dialog-cancel')?.addEventListener('click', closeAdmin);
    document.getElementById('delete-dialog-close')?.addEventListener('click', closeDelete);
    document.getElementById('delete-dialog-cancel')?.addEventListener('click', closeDelete);

    adminDialog.addEventListener('click', (e) => { if (e.target === adminDialog) closeAdmin(); });
    deleteDialog.addEventListener('click', (e) => { if (e.target === deleteDialog) closeDelete(); });

    // Form submit
    document.getElementById('admin-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = (document.getElementById('admin-id') as HTMLInputElement).value;
      const email = (document.getElementById('admin-email') as HTMLInputElement).value.trim();
      const name = (document.getElementById('admin-name') as HTMLInputElement).value.trim();
      const password = (document.getElementById('admin-password') as HTMLInputElement).value;

      if (!email || (!id && !password)) {
        toast('Please fill in all required fields');
        return;
      }

      const submitBtn = document.getElementById('admin-submit-btn') as HTMLButtonElement;
      submitBtn.disabled = true;
      submitBtn.textContent = id ? 'Saving...' : 'Creating...';

      try {
        let res;
        if (id) {
          const data: { email?: string; name?: string; password?: string } = { email, name };
          if (password) data.password = password;
          res = await api.updateAdmin(id, data);
        } else {
          res = await api.createAdmin({ email, password, name });
        }

        if (res.success) {
          toast(id ? 'Admin updated successfully' : 'Admin created successfully');
          closeAdmin();
          await loadAdmins();
        } else {
          toast(res.message || 'Operation failed');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = id ? 'Save Changes' : 'Create Admin';
      }
    });

    // Delete confirm
    document.getElementById('delete-confirm-btn')?.addEventListener('click', async () => {
      const id = (document.getElementById('delete-admin-id') as HTMLInputElement).value;
      if (!id) return;

      const btn = document.getElementById('delete-confirm-btn') as HTMLButtonElement;
      btn.disabled = true;
      btn.textContent = 'Deleting...';

      try {
        const res = await api.deleteAdmin(id);
        if (res.success) {
          toast('Admin deleted');
          closeDelete();
          await loadAdmins();
        } else {
          toast(res.message || 'Failed to delete admin');
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Delete Admin';
      }
    });

    await loadAdmins();
  },
};
