import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { store } from '../store.ts';

describe('Auth Module', () => {
  beforeEach(() => {
    store.set('isAuthenticated', false);
    store.set('adminEmail', null);
    store.set('useApi', false);
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  describe('authGuard', () => {
    it('should return true when authenticated', async () => {
      // Dynamic import to avoid hoisting issues
      const { authGuard } = await import('../auth.ts');

      store.set('isAuthenticated', true);
      expect(authGuard()).toBe(true);
    });

    it('should return false when not authenticated', async () => {
      const { authGuard } = await import('../auth.ts');

      store.set('isAuthenticated', false);
      expect(authGuard()).toBe(false);
    });
  });

  describe('login (demo mode)', () => {
    it('should succeed with valid credentials in demo mode', async () => {
      const { login } = await import('../auth.ts');

      store.set('useApi', false);

      const result = await login('admin@test.com', 'password');

      expect(result.success).toBe(true);
      expect(store.get('isAuthenticated')).toBe(true);
    });

    it('should handle demo mode login and set admin email from parameter', async () => {
      const { login } = await import('../auth.ts');

      store.set('useApi', false);

      await login('test@admin.com', 'password');

      // In demo mode with demo_token, the JWT decoding will fail
      // so it falls back to the provided email
      expect(store.get('adminEmail')).toBe('test@admin.com');
    });
  });

  describe('logout', () => {
    it('should clear auth state', async () => {
      const { logout } = await import('../auth.ts');

      store.set('isAuthenticated', true);
      store.set('adminEmail', 'admin@test.com');
      sessionStorage.setItem('bm_csrf', 'test_token');

      await logout();

      expect(store.get('isAuthenticated')).toBe(false);
      expect(store.get('adminEmail')).toBe(null);
    });
  });

  describe('verifySession', () => {
    it('should return true when authenticated in demo mode', async () => {
      const { verifySession } = await import('../auth.ts');

      store.set('useApi', false);
      store.set('isAuthenticated', true);

      const result = await verifySession();
      expect(result).toBe(true);
      expect(store.get('isAuthenticated')).toBe(true);
    });

    it('should return false when not authenticated in demo mode', async () => {
      const { verifySession } = await import('../auth.ts');

      store.set('useApi', false);
      store.set('isAuthenticated', false);

      const result = await verifySession();
      expect(result).toBe(false);
    });
  });
});
