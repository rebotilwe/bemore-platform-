/**
 * Demo-mode warning banner.
 *
 * Shown when checkBackend() fails and the app falls back to localStorage-only
 * demo mode. Without this, a real applicant could fill out and "submit" the
 * form with no visible indication that nothing actually reached the backend —
 * the success page looks identical either way. This makes the state visible
 * and offers a one-click retry.
 */
import { api } from '../api.ts';
import { store } from '../store.ts';

const BANNER_ID = 'demo-mode-banner';

export function showDemoModeBanner(): void {
  if (document.getElementById(BANNER_ID)) return; // already showing

  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.setAttribute('role', 'alert');
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    background: #c94c4c; color: #fff; font-family: sans-serif;
    font-size: 13px; padding: 10px 16px; display: flex; align-items: center;
    justify-content: center; gap: 12px; flex-wrap: wrap; text-align: center;
  `;
  banner.innerHTML = `
    <span>⚠ Can't reach the server right now — anything submitted on this page will <strong>not</strong> be saved. Please try again shortly.</span>
    <button id="demo-mode-retry-btn" style="background:#fff;color:#c94c4c;border:none;padding:4px 12px;border-radius:4px;font-weight:600;cursor:pointer;">
      Retry
    </button>
  `;
  document.body.prepend(banner);

  document.getElementById('demo-mode-retry-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('demo-mode-retry-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Checking...';
    const online = await api.checkBackend();
    store.set('useApi', online);
    if (online) {
      window.location.reload();
    } else {
      btn.disabled = false;
      btn.textContent = 'Retry';
    }
  });
}

export function hideDemoModeBanner(): void {
  document.getElementById(BANNER_ID)?.remove();
}