import { store } from './store.ts';
import { api } from './api.ts';
import { navigate } from './router.ts';

export async function login(email: string, password: string): Promise<{ success: boolean; message?: string }> {
  const result = await api.login(email, password);
  if (result.success && result.data) {
    store.set('token', result.data.token);
    store.set('isAuthenticated', true);
    return { success: true };
  }
  return { success: false, message: result.message || 'Invalid credentials' };
}

export function logout(): void {
  store.set('token', null);
  store.set('isAuthenticated', false);
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
  }
  return valid;
}
