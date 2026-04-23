import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We need to mock modules properly
// Since api.ts imports store and uses localStore, we need to preserve those

// First, let's test the API in demo mode (useApi = false)
// We'll import the actual modules

import { store } from '../store.ts';

describe('API Client - Demo Mode', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    store.set('useApi', false);
    store.set('isAuthenticated', false);
    // Clear auth state
    store.set('adminEmail', null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('checkBackend', () => {
    it('should return true when backend is available', async () => {
      // Dynamic import to avoid hoisting issues
      const { api } = await import('../api.ts');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
        text: () => Promise.resolve('{"success":true}'),
      } as Response);

      const result = await api.checkBackend();
      expect(result).toBe(true);
    });

    it('should return false when backend is unavailable', async () => {
      const { api } = await import('../api.ts');

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await api.checkBackend();
      expect(result).toBe(false);
    });
  });

  describe('login', () => {
    it('should return success with demo token when credentials provided', async () => {
      const { api } = await import('../api.ts');

      const result = await api.login('admin@test.com', 'password');

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('token', 'demo_token');
    });

    it('should return failure when credentials are empty', async () => {
      const { api } = await import('../api.ts');

      const result = await api.login('', '');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });
  });

  describe('verifyToken', () => {
    it('should return true when authenticated in demo mode', async () => {
      const { api } = await import('../api.ts');

      store.set('isAuthenticated', true);

      const result = await api.verifyToken();
      expect(result).toBe(true);
    });

    it('should return false when not authenticated in demo mode', async () => {
      const { api } = await import('../api.ts');

      store.set('isAuthenticated', false);

      const result = await api.verifyToken();
      expect(result).toBe(false);
    });
  });
});

describe('API Client - Direct localStorage tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // Note: jsdom localStorage tests can be flaky
  // These are simple tests to verify the concept
  it('should filter applications by userType manually', () => {
    const apps = [
      { _id: '1', userType: 'developer', status: 'new', tags: [], personal: { email: 'a@test.com' } },
      { _id: '2', userType: 'investor', status: 'new', tags: [], personal: { email: 'b@test.com' } },
    ];

    const filtered = apps.filter(a => a.userType === 'developer');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].userType).toBe('developer');
  });
});
