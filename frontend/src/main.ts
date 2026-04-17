import './styles/main.css';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { router } from './router.ts';
import { api } from './api.ts';
import { store } from './store.ts';
import { verifySession } from './auth.ts';
import { ErrorBoundary } from './components/error-boundary.ts';

import { tracker } from './services/tracker.ts';

inject();
injectSpeedInsights();

new ErrorBoundary('app');

async function init(): Promise<void> {
  // Check backend availability
  const online = await api.checkBackend();
  store.set('useApi', online);
  if (import.meta.env.DEV) console.log(online ? '✓ Connected to backend API' : '◌ Running in localStorage demo mode');

  // Verify existing session token
  if (store.get('token')) {
    const valid = await verifySession();
    if (!valid && import.meta.env.DEV) console.log('◌ Session expired — logged out');
  }

  // Capture engagement source from URL params (e.g., ?src=qr)
  const urlParams = new URLSearchParams(window.location.search);
  const source = urlParams.get('src') || urlParams.get('utm_source');
  if (source) {
    sessionStorage.setItem('bm_source', source);
  }

  // Load feature flags before rendering (fast — single key lookup)
  if (online) {
    try {
      const flagRes = await api.getSetting('polls_enabled');
      if (flagRes.success && flagRes.data?.value !== undefined) {
        store.set('pollsEnabled', flagRes.data.value === true || flagRes.data.value === 'true');
      } else {
        store.set('pollsEnabled', true); // Default to enabled if not set
      }
    } catch {
      store.set('pollsEnabled', true); // Default to enabled on error
    }
  } else {
    store.set('pollsEnabled', true); // Demo mode — show everything
  }

  // Initialize tracker (visitor/session IDs, UTM capture, click listener)
  tracker.init();

  // Initialize router
  router.init();

  // Register service worker (static assets only — never caches API or HTML)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

init();
