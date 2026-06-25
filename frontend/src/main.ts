import './styles/main.css';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { router } from './router.ts';
import { api } from './api.ts';
import { store } from './store.ts';
import { verifySession } from './auth.ts';
import { ErrorBoundary } from './components/error-boundary.ts';

import { tracker } from './services/tracker.ts';
import { initInstallPrompt } from './components/install-prompt.ts';

inject();
injectSpeedInsights();

// Load Google Fonts asynchronously (avoid render-blocking)
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400&display=swap';
document.head.appendChild(fontLink);

new ErrorBoundary('app');

async function init(): Promise<void> {
  // Check backend availability
  const online = await api.checkBackend();
  store.set('useApi', online);
  if (import.meta.env.DEV) console.log(online ? '✓ Connected to backend API' : '◌ Running in localStorage demo mode');

  // Always verify session with backend on page load (cookie is auto-sent)
  // This handles both returning users and fresh page loads
  if (online) {
    const valid = await verifySession();
    if (import.meta.env.DEV) console.log(valid ? '✓ Session valid' : '◌ No valid session');
  }

  // Capture engagement source from URL params (e.g., ?src=qr)
  const urlParams = new URLSearchParams(window.location.search);
  const source = urlParams.get('src') || urlParams.get('utm_source');
  if (source) {
    sessionStorage.setItem('bm_source', source);
  }

  // Initialize tracker (visitor/session IDs, UTM capture, click listener)
  tracker.init();

  // Initialize router
  router.init();

  // Service worker disabled — unregister any existing registrations
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
  }

  // PWA install prompt (shows after 15s if not dismissed)
  initInstallPrompt();
}

init();
