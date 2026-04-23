import type { Page } from '../../types/index.ts';
import { api } from '../../api.ts';
import { mountAdminLayout } from './layout.ts';
import { toast } from '../../components/toast.ts';

interface AdminUser {
  _id: string;
  email: string;
  name: string;
  createdAt: string;
}

export const adminsPage: Page = {
  render() {
    return `
    <div class="settings-page">
      <div class="settings-header">
        <h2 class="admin-main-title">Admin Users</h2>
        <p class="settings-header-sub">Manage who has access to the admin dashboard.</p>
      </div>

      <div class="admins-actions">
        <button class="btn-primary" id="add-admin-btn">Add Admin User</button>
      </div>

      <div id="admins-content">
        <div class="skeleton skeleton-card"></div>
      </div>

      <dialog id="admin-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title" id="admin-modal-title">Add Admin User</h3>
            <button class="modal-close" id="admin-modal-close">&times;</button>
          </div>
          <form id="admin-form" class="modal-form">
            <input type="hidden" id="admin-id" />
            <div class="form-group">
              <label for="admin-email" class="form-label">Email</label>
              <input type="email" id="admin-email" class="form-input" required />
            </div>
            <div class="form-group">
              <label for="admin-name" class="form-label">Name (optional)</label>
              <input type="text" id="admin-name" class="form-input" />
            </div>
            <div class="form-group">
              <label for="admin-password" class="form-label">Password</label>
              <input type="password" id="admin-password" class="form-input" minlength="8" required />
              <span class="form-hint">Minimum 8 characters</span>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-ghost" id="admin-modal-cancel">Cancel</button>
              <button type="submit" class="btn-primary" id="admin-submit-btn">Create</button>
            </div>
          </form>
        </div>
      </dialog>

      <dialog id="delete-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Delete Admin</h3>
            <button class="modal-close" id="delete-modal-close">&times;</button>
          </div>
          <p class="modal-body-text">Are you sure you want to delete this admin user? This action cannot be undone.</p>
          <input type="hidden" id="delete-admin-id" />
          <div class="modal-actions">
            <button type="button" class="btn-ghost" id="delete-modal-cancel">Cancel</button>
            <button type="button" class="btn-danger" id="delete-confirm-btn">Delete</button>
          </div>
        </div>
      </dialog>
    </div>`;
  },

  async mount() {
    mountAdminLayout();

    const container = document.getElementById('admins-content');
    const addBtn = document.getElementById('add-admin-btn');
    const adminModal = document.getElementById('admin-modal') as HTMLDialogElement;
    const deleteModal = document.getElementById('delete-modal') as HTMLDialogElement;
    if (!container || !addBtn || !adminModal || !deleteModal) return;

    let admins: AdminUser[] = [];

    // Load admins
    async function loadAdmins() {
      const res = await api.getAdmins();
      admins = (res.success && res.data) as AdminUser[] || [];
      renderAdmins();
    }

    function renderAdmins() {
      if (!container) return;
      if (admins.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">&#9780;</div>
            <p class="empty-text">No admin users found</p>
            <p class="empty-subtext">Add an admin to enable dashboard access.</p>
          </div>`;
        return;
      }

      container.innerHTML = `
        <div class="admins-list">
          ${admins.map(admin => `
            <div class="admin-card" data-id="${admin._id}">
              <div class="admin-card-info">
                <div class="admin-card-email">${admin.email}</div>
                <div class="admin-card-name">${admin.name || '—'}</div>
                <div class="admin-card-date">Created ${new Date(admin.createdAt).toLocaleDateString('en-ZA')}</div>
              </div>
              <div class="admin-card-actions">
                <button class="btn-sm btn-ghost edit-admin-btn" data-id="${admin._id}">Edit</button>
                <button class="btn-sm btn-danger delete-admin-btn" data-id="${admin._id}">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>`;

      // Attach event listeners
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
      (document.getElementById('admin-modal-title') as HTMLElement).textContent = 'Add Admin User';
      (document.getElementById('admin-submit-btn') as HTMLElement).textContent = 'Create';
      (document.getElementById('admin-password') as HTMLInputElement).required = true;
      adminModal.showModal();
    }

    function openEditModal(id: string) {
      const admin = admins.find(a => a._id === id);
      if (!admin) return;

      (document.getElementById('admin-id') as HTMLInputElement).value = id;
      (document.getElementById('admin-email') as HTMLInputElement).value = admin.email;
      (document.getElementById('admin-name') as HTMLInputElement).value = admin.name;
      (document.getElementById('admin-password') as HTMLInputElement).value = '';
      (document.getElementById('admin-modal-title') as HTMLElement).textContent = 'Edit Admin User';
      (document.getElementById('admin-submit-btn') as HTMLElement).textContent = 'Save';
      (document.getElementById('admin-password') as HTMLInputElement).required = false;
      adminModal.showModal();
    }

    function openDeleteModal(id: string) {
      (document.getElementById('delete-admin-id') as HTMLInputElement).value = id;
      deleteModal.showModal();
    }

    // Event listeners
    addBtn.addEventListener('click', openAddModal);

    document.getElementById('admin-modal-close')?.addEventListener('click', () => adminModal.close());
    document.getElementById('admin-modal-cancel')?.addEventListener('click', () => adminModal.close());
    document.getElementById('delete-modal-close')?.addEventListener('click', () => deleteModal.close());
    document.getElementById('delete-modal-cancel')?.addEventListener('click', () => deleteModal.close());

    // Close modal on backdrop click
    adminModal.addEventListener('click', (e) => {
      if (e.target === adminModal) adminModal.close();
    });
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) deleteModal.close();
    });

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
          const updateData: { email?: string; name?: string; password?: string } = { email, name };
          if (password) updateData.password = password;
          res = await api.updateAdmin(id, updateData);
        } else {
          res = await api.createAdmin({ email, password, name });
        }

        if (res.success) {
          toast(id ? 'Admin updated' : 'Admin created');
          adminModal.close();
          await loadAdmins();
        } else {
          toast(res.message || 'Failed to save admin');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = id ? 'Save' : 'Create';
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
          deleteModal.close();
          await loadAdmins();
        } else {
          toast(res.message || 'Failed to delete admin');
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Delete';
      }
    });

    // Initial load
    await loadAdmins();
  },
};