import type { Page, Application, FunderName } from '../../types/index.ts';
import { api } from '../../api.ts';
import { toast } from '../../components/toast.ts';
import { CATEGORY_LABELS } from '../../constants/categories.ts';
import { FUNDERS } from '../../constants/funders.ts';
import { mountAdminLayout } from './layout.ts';

function renderCard(app: Application): string {
  const name = `${app.personal?.firstName ?? ''} ${app.personal?.surname ?? ''}`.trim() || 'Unknown';
  const typeLbl = CATEGORY_LABELS[app.userType] || app.userType;
  const summitChecked = app.dealRoom?.summitAccess ? ' checked' : '';
  const dealRoomChecked = app.dealRoom?.dealRoomEntry ? ' checked' : '';
  const activeFunders = app.dealRoom?.funders ?? [];

  const funderChips = FUNDERS.map(f => {
    const on = activeFunders.includes(f) ? ' on' : '';
    return `<button class="funder-chip${on}" data-app="${app._id}" data-funder="${f}">${f}</button>`;
  }).join('');

  return `
  <div class="dr-card" data-app-id="${app._id}">
    <div class="dr-name">${name}</div>
    <div class="dr-type">${typeLbl}</div>
    <div class="dr-checks">
      <label class="dr-check-box">
        <input type="checkbox" data-app="${app._id}" data-field="summitAccess"${summitChecked} />
        Summit Access
      </label>
      <label class="dr-check-box">
        <input type="checkbox" data-app="${app._id}" data-field="dealRoomEntry"${dealRoomChecked} />
        Deal Room Entry
      </label>
    </div>
    <div class="dr-funders">${funderChips}</div>
  </div>`;
}

async function loadDealRoom(): Promise<void> {
  const container = document.getElementById('dr-content');
  if (!container) return;

  const res = await api.getApplications({ status: 'shortlisted' });
  const res2 = await api.getApplications({ status: 'invited' });

  const apps: Application[] = [];
  if (res.success) apps.push(...res.data);
  if (res2.success) apps.push(...res2.data);

  if (!res.success && !res2.success) {
    container.innerHTML = '<p class="empty-state">Failed to load deal room data.</p>';
    return;
  }

  if (!apps.length) {
    container.innerHTML = '<p class="empty-state">No shortlisted or invited applications yet.</p>';
    return;
  }

  container.innerHTML = `<div class="dr-grid">${apps.map(renderCard).join('')}</div>`;
  bindDealRoomActions(apps);
}

function bindDealRoomActions(apps: Application[]): void {
  // Summit access / deal room entry checkboxes
  document.querySelectorAll<HTMLInputElement>('[data-field]').forEach(checkbox => {
    checkbox.addEventListener('change', async () => {
      const appId = checkbox.dataset.app!;
      const field = checkbox.dataset.field as 'summitAccess' | 'dealRoomEntry';
      const app = apps.find(a => a._id === appId);
      if (!app) return;

      const dealRoom = { ...app.dealRoom, [field]: checkbox.checked };
      const res = await api.updateApplication(appId, { dealRoom });
      if (res.success && res.data) {
        Object.assign(app.dealRoom, res.data.dealRoom ?? dealRoom);
        toast(`${field === 'summitAccess' ? 'Summit access' : 'Deal room entry'} ${checkbox.checked ? 'granted' : 'revoked'}`);
      }
    });
  });

  // Funder chips
  document.querySelectorAll<HTMLButtonElement>('.funder-chip[data-app]').forEach(chip => {
    chip.addEventListener('click', async () => {
      const appId = chip.dataset.app!;
      const funder = chip.dataset.funder as FunderName;
      const app = apps.find(a => a._id === appId);
      if (!app) return;

      const currentFunders = app.dealRoom?.funders ?? [];
      const idx = currentFunders.indexOf(funder);
      const newFunders = idx > -1
        ? currentFunders.filter(f => f !== funder)
        : [...currentFunders, funder];

      const dealRoom = { ...app.dealRoom, funders: newFunders };
      const res = await api.updateApplication(appId, { dealRoom });
      if (res.success && res.data) {
        app.dealRoom.funders = newFunders;
        chip.classList.toggle('on');
        toast(`${funder} ${idx > -1 ? 'removed' : 'assigned'}`);
      }
    });
  });
}

export const dealRoomPage: Page = {
  render() {
    return `
    <div class="deal-room-page">
      <h2 class="page-h">Deal Room</h2>
      <div id="dr-content">
        <p>Loading...</p>
      </div>
    </div>`;
  },

  mount() {
    mountAdminLayout();
    loadDealRoom();
  },
};
