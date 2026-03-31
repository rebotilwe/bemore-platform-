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

const SETTING_DEFS: SettingDef[] = [
  {
    key: 'mentimeter_id',
    label: 'Mentimeter Embed ID',
    description: 'The Mentimeter presentation ID for the live poll page (e.g., alhr8tvbfhhu). Found in your Mentimeter share URL.',
    type: 'text',
    defaultValue: 'alhr8tvbfhhu',
  },
];

// Summit fields are saved as a single `summit_config` JSON object
interface SummitField { key: string; label: string; type: 'text' | 'boolean'; defaultValue: string | boolean }
const SUMMIT_FIELDS: SummitField[] = [
  { key: 'active', label: 'Summit Mode Active', type: 'boolean', defaultValue: true },
  { key: 'date', label: 'Summit Date', type: 'text', defaultValue: '30 – 31 March 2026' },
  { key: 'date_short', label: 'Summit Date (Short)', type: 'text', defaultValue: 'Mar 30–31' },
  { key: 'venue', label: 'Venue Name', type: 'text', defaultValue: 'Sandton Convention Centre' },
  { key: 'location', label: 'Location', type: 'text', defaultValue: 'Sandton, Gauteng' },
  { key: 'venue_full', label: 'Full Venue', type: 'text', defaultValue: 'Sandton Convention Centre, Sandton' },
];

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

    const summitConfig = (settings['summit_config'] as Record<string, unknown>) || {};

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

        <div class="settings-card" data-setting="summit_config">
          <div class="settings-card-header">
            <h3 class="settings-card-title">Summit Configuration</h3>
            <p class="settings-card-desc">Control summit-specific content across the platform. Toggle "Summit Mode Active" off after the event to hide all summit banners and dates. Changes take effect on next page load.</p>
          </div>
          <div class="settings-card-body">
            ${SUMMIT_FIELDS.map(f => {
              const val = summitConfig[f.key] ?? f.defaultValue;
              if (f.type === 'boolean') {
                const checked = val === true || val === 'true';
                return `<div style="margin-bottom:var(--sp-4)">
                  <label class="settings-toggle">
                    <input type="checkbox" data-summit="${f.key}" ${checked ? 'checked' : ''} />
                    <span class="settings-toggle-slider"></span>
                    <span class="settings-toggle-label">${checked ? 'Enabled' : 'Disabled'}</span>
                  </label>
                  <span style="font-size:var(--fs-body-xs);color:var(--steel);margin-left:var(--sp-2)">${f.label}</span>
                </div>`;
              }
              return `<div style="margin-bottom:var(--sp-3)">
                <label style="font-size:var(--fs-body-xs);color:var(--steel);display:block;margin-bottom:var(--sp-1)">${f.label}</label>
                <input type="text" class="settings-input" data-summit="${f.key}" value="${String(val)}" />
              </div>`;
            }).join('')}
          </div>
          <div class="settings-card-footer">
            <button class="btn-primary btn-sm" id="summit-save">Save Summit Config</button>
            <span class="settings-saved-msg" id="saved-summit_config"></span>
          </div>
        </div>
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

    // Summit config save (combined object)
    document.getElementById('summit-save')?.addEventListener('click', async () => {
      const btn = document.getElementById('summit-save') as HTMLButtonElement;
      const obj: Record<string, unknown> = {};
      SUMMIT_FIELDS.forEach(f => {
        if (f.type === 'boolean') {
          const cb = container.querySelector(`input[data-summit="${f.key}"]`) as HTMLInputElement;
          obj[f.key] = cb?.checked ?? f.defaultValue;
        } else {
          const inp = container.querySelector(`input[data-summit="${f.key}"]`) as HTMLInputElement;
          obj[f.key] = inp?.value.trim() || f.defaultValue;
        }
      });

      btn.disabled = true;
      btn.textContent = 'Saving...';
      const saveRes = await api.updateSetting('summit_config', obj);
      btn.disabled = false;
      btn.textContent = 'Save Summit Config';

      if (saveRes.success) {
        toast('Summit configuration updated — changes visible on next page load');
        const msg = document.getElementById('saved-summit_config');
        if (msg) { msg.textContent = 'Saved'; msg.style.opacity = '1'; setTimeout(() => { msg.style.opacity = '0'; }, 2000); }
      } else {
        toast('Failed to save summit config');
      }
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
