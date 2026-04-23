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
        store.set('pollsEnabled', false); // Default to disabled if not set
      }
    } catch {
      store.set('pollsEnabled', false); // Default to disabled on error
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
