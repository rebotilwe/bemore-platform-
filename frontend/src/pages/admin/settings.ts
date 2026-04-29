import type { Page } from '../../types/index.ts';
import { api } from '../../api.ts';
import { mountAdminLayout } from './layout.ts';
import { toast } from '../../components/toast.ts';

interface SettingDef {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'boolean' | 'textarea';
  defaultValue: string | boolean;
}

const SETTING_DEFS: SettingDef[] = [];


function renderSettingField(def: SettingDef, value: unknown): string {
  const val = value ?? def.defaultValue;

  if (def.type === 'boolean') {
    const checked = val === true || val === 'true';
    return `
      <label class="settings-toggle">
        <input type="checkbox" data-key="${def.key}" ${checked ? 'checked' : ''} />
        <span class="settings-toggle-slider"></span>
        <span class="settings-toggle-label">${checked ? 'Enabled' : 'Disabled'}</span>
      </label>`;
  }

  if (def.type === 'textarea') {
    return `<textarea class="settings-input" data-key="${def.key}" rows="3">${String(val)}</textarea>`;
  }

  return `<input type="text" class="settings-input" data-key="${def.key}" value="${String(val)}" />`;
}

export const settingsPage: Page = {
  render() {
    return `
    <div class="settings-page">
      <div class="settings-header">
        <h2 class="admin-main-title">Platform Settings</h2>
        <p class="settings-header-sub">Configure platform behaviour without code deploys. Changes take effect immediately.</p>
      </div>

      <div id="settings-content">
        <div class="skeleton skeleton-card"></div>
      </div>
    </div>`;
  },

  async mount() {
    mountAdminLayout();

    const container = document.getElementById('settings-content');
    if (!container) return;

    // Load current settings
    const res = await api.getAllSettings();
    const settings: Record<string, unknown> = res.success && res.data ? res.data : {};

    container.innerHTML = `
      <div class="settings-grid">
        ${SETTING_DEFS.map(def => `
          <div class="settings-card" data-setting="${def.key}">
            <div class="settings-card-header">
              <h3 class="settings-card-title">${def.label}</h3>
              <p class="settings-card-desc">${def.description}</p>
            </div>
            <div class="settings-card-body">
              ${renderSettingField(def, settings[def.key])}
            </div>
            <div class="settings-card-footer">
              <button class="btn-primary btn-sm settings-save" data-key="${def.key}">Save</button>
              <span class="settings-saved-msg" id="saved-${def.key}"></span>
            </div>
          </div>
        `).join('')}

      </div>`;

    // Save handlers
    container.querySelectorAll('.settings-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = (btn as HTMLElement).dataset.key!;
        const def = SETTING_DEFS.find(d => d.key === key)!;
        let value: unknown;

        if (def.type === 'boolean') {
          const checkbox = container.querySelector(`input[data-key="${key}"]`) as HTMLInputElement;
          value = checkbox.checked;
        } else {
          const input = container.querySelector(`[data-key="${key}"]`) as HTMLInputElement;
          value = input.value.trim();
        }

        (btn as HTMLButtonElement).disabled = true;
        (btn as HTMLButtonElement).textContent = 'Saving...';

        const saveRes = await api.updateSetting(key, value);

        (btn as HTMLButtonElement).disabled = false;
        (btn as HTMLButtonElement).textContent = 'Save';

        if (saveRes.success) {
          toast(`${def.label} updated`);
          const msg = document.getElementById(`saved-${key}`);
          if (msg) {
            msg.textContent = 'Saved';
            msg.style.opacity = '1';
            setTimeout(() => { msg.style.opacity = '0'; }, 2000);
          }
        } else {
          toast('Failed to save setting');
        }
      });
    });

    // Toggle label update on checkbox change
    container.querySelectorAll('.settings-toggle input').forEach(cb => {
      cb.addEventListener('change', () => {
        const label = (cb as HTMLElement).parentElement?.querySelector('.settings-toggle-label');
        if (label) label.textContent = (cb as HTMLInputElement).checked ? 'Enabled' : 'Disabled';
      });
    });
  },
};
