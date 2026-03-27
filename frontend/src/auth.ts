import { store } from './store.ts';
import { api } from './api.ts';
import { navigate } from './router.ts';

function parseToken(token: string): { email?: string } {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { email: payload.email };
  } catch {
    return {};
  }
}

export async function login(email: string, password: string): Promise<{ success: boolean; message?: string }> {
  const result = await api.login(email, password);
  if (result.success && result.data) {
    store.set('token', result.data.token);
    store.set('isAuthenticated', true);
    const parsed = parseToken(result.data.token);
    store.set('adminEmail', parsed.email || email);
    return { success: true };
  }
  return { success: false, message: result.message || 'Invalid credentials' };
}

export function logout(): void {
  store.set('token', null);
  store.set('isAuthenticated', false);
  store.set('adminEmail', null);
  navigate('/');
}

export function authGuard(): boolean {
  return store.get('isAuthenticated');
}

export async function verifySession(): Promise<boolean> {
  if (!store.get('token')) return false;
  const valid = await api.verifyToken();
  if (!valid) {
    store.set('token', null);
    store.set('isAuthenticated', false);
    store.set('adminEmail', null);
  } else if (!store.get('adminEmail')) {
    const parsed = parseToken(store.get('token')!);
    if (parsed.email) store.set('adminEmail', parsed.email);
  }
  return valid;
}
