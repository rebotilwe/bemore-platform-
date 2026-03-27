import './styles/main.css';
import { router } from './router.ts';
import { api } from './api.ts';
import { store } from './store.ts';
import { verifySession } from './auth.ts';

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

  // Initialize router
  router.init();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

init();
