import { store } from './store.js';
import { api } from './api.js';
import { navigate } from './router.js';

export async function login(email: string, password: string) {
  const result = await api.login(email, password);
  if (result.success && result.data) {
    store.set('isAuthenticated', true);
    const csrfToken = result.data && result.data.csrfToken;
    if (csrfToken) {
      sessionStorage.setItem('bm_csrf', csrfToken);
    }
    const token = result.data && result.data.token;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload && payload.email) store.set('adminEmail', payload.email);
      } catch {
        store.set('adminEmail', email);
      }
    } else {
      store.set('adminEmail', email);
    }
    return { success: true };
  }
  return { success: false, message: result.message || 'Invalid credentials' };
}

export async function logout() {
  try { await api.logout(); } catch(e) {}
  store.set('isAuthenticated', false);
  store.set('adminEmail', null);
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
