import { store } from './store.js';
import { api } from './api.js';
import { navigate } from './router.js';

export async function login(email: string, password: string) {
  const result = await api.login(email, password);
  if (result.success && result.data) {
    store.set('isAuthenticated', true);

    // Store JWT for Bearer auth (works through Vercel proxy rewrites)
    if (result.data.token) {
      sessionStorage.setItem('bm_token', result.data.token);
      try {
        const payload = JSON.parse(atob(result.data.token.split('.')[1]));
        if (payload?.email) store.set('adminEmail', payload.email);
      } catch {
        store.set('adminEmail', email);
      }
    } else {
      store.set('adminEmail', email);
    }

    // Store CSRF token for state-changing requests
    if (result.data.csrfToken) {
      sessionStorage.setItem('bm_csrf', result.data.csrfToken);
    }

    return { success: true };
  }
  return { success: false, message: result.message || 'Invalid credentials' };
}

export async function logout() {
  try { await api.logout(); } catch { /* ignore */ }
  store.set('isAuthenticated', false);
  store.set('adminEmail', null);
  sessionStorage.removeItem('bm_token');
  sessionStorage.removeItem('bm_csrf');
  navigate('/');
}

export function authGuard() {
  if (store.get('isAuthenticated')) return true;
  return false;
}

export async function verifySession() {
  const valid = await api.verifyToken();
  if (valid) {
    store.set('isAuthenticated', true);
  } else {
    store.set('isAuthenticated', false);
    store.set('adminEmail', null);
    sessionStorage.removeItem('bm_csrf');
  }
  return valid;
}
