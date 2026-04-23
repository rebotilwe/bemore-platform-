/**
 * PWA Install Prompt — captures beforeinstallprompt and shows a
 * branded banner after a short delay. Dismissible, remembers choice.
 */

const DISMISS_KEY = 'bm_install_dismissed';
const DELAY_MS = 15_000; // Show after 15s on page
const DISMISS_DAYS = 30;

let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isDismissed(): boolean {
  const val = localStorage.getItem(DISMISS_KEY);
  if (!val) return false;
  const expiry = parseInt(val, 10);
  if (Date.now() > expiry) {
    localStorage.removeItem(DISMISS_KEY);
    return false;
  }
  return true;
}

function dismiss(): void {
  localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
  removeBanner();
}

function removeBanner(): void {
  document.getElementById('pwa-install-banner')?.remove();
}

function showBanner(): void {
  if (!deferredPrompt || isDismissed()) return;

  // Don't show if already installed (standalone mode)
  if (window.matchMedia('(display-mode: standalone)').matches) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.className = 'install-banner';
  banner.innerHTML = `
    <div class="install-banner-inner">
      <div class="install-banner-left">
        <img src="/icons/icon-96.png" alt="BeMore" class="install-banner-icon" width="48" height="48" />
        <div class="install-banner-text">
          <div class="install-banner-title">Install BeMore</div>
          <div class="install-banner-sub">Quick access from your home screen</div>
        </div>
      </div>
      <div class="install-banner-actions">
        <button class="install-banner-btn" id="pwa-install-btn">Install</button>
        <button class="install-banner-dismiss" id="pwa-dismiss-btn" aria-label="Dismiss">&times;</button>
      </div>
    </div>`;

  document.body.appendChild(banner);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => banner.classList.add('show'));
  });

  document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    removeBanner();
    if (outcome === 'dismissed') dismiss();
  });

  document.getElementById('pwa-dismiss-btn')?.addEventListener('click', dismiss);
}

export function initInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;

    // Show after delay (don't interrupt user immediately)
    setTimeout(showBanner, DELAY_MS);
  });

  // Clean up if user installs via browser UI
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    removeBanner();
  });
}
