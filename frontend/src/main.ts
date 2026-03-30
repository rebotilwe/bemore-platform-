import './styles/main.css';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { router } from './router.ts';
import { api } from './api.ts';
import { store } from './store.ts';
import { verifySession } from './auth.ts';
import { ErrorBoundary } from './components/error-boundary.ts';

injectSpeedInsights();

new ErrorBoundary('app');

async function init(): Promise<void> {
  // Check backend availability
  const online = await api.checkBackend();
  store.set('useApi', online);
  console.log(online ? '✓ Connected to backend API' : '◌ Running in localStorage demo mode');

  // Verify existing session token
  if (store.get('token')) {
    const valid = await verifySession();
    if (!valid) console.log('◌ Session expired — logged out');
  }

  // Capture engagement source from URL params (e.g., ?src=qr)
  const urlParams = new URLSearchParams(window.location.search);
  const source = urlParams.get('src') || urlParams.get('utm_source');
  if (source) {
    sessionStorage.setItem('bm_source', source);
  }

  // Initialize router
  router.init();

  // Register service worker (static assets only — never caches API or HTML)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

init();
