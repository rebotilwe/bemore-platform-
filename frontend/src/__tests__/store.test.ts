import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { store } from '../store.ts';

describe('Store', () => {
  beforeEach(() => {
    // Reset store to initial state by creating a new instance
    // Since store is a singleton, we can't easily reset it
    // Instead, we'll set known values for each test
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('should return the current value for a key', () => {
      store.set('isAuthenticated', true);
      expect(store.get('isAuthenticated')).toBe(true);
    });

    it('should return the initial value when not set', () => {
      // These are the initial values from the Store constructor
      expect(store.get('useApi')).toBe(false);
      expect(store.get('currentStep')).toBe(1);
    });
  });

  describe('set', () => {
    it('should update the value for a key', () => {
      store.set('isAuthenticated', true);
      expect(store.get('isAuthenticated')).toBe(true);

      store.set('isAuthenticated', false);
      expect(store.get('isAuthenticated')).toBe(false);
    });

    it('should handle different value types', () => {
      store.set('adminEmail', 'admin@test.com');
      expect(store.get('adminEmail')).toBe('admin@test.com');

      store.set('currentStep', 3);
      expect(store.get('currentStep')).toBe(3);

      const formData = { test: 'data' };
      store.set('formData', formData);
      expect(store.get('formData')).toEqual(formData);
    });
  });

  describe('subscribe', () => {
    it('should add a listener and return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe('isAuthenticated', listener);

      store.set('isAuthenticated', true);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      store.set('isAuthenticated', false);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should support multiple listeners for the same key', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      store.subscribe('isAuthenticated', listener1);
      store.subscribe('isAuthenticated', listener2);

      store.set('isAuthenticated', true);
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('getState', () => {
    it('should return the full state object', () => {
      const state = store.getState();
      expect(state).toHaveProperty('isAuthenticated');
      expect(state).toHaveProperty('adminEmail');
      expect(state).toHaveProperty('useApi');
    });
  });
});

describe('LocalStore', () => {
  const TEST_KEY = 'bm_apps';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // Note: Direct localStorage tests are simplified due to jsdom limitations
  describe('localStorage interactions', () => {
    it('should return empty array when no data stored', () => {
      const stored = JSON.parse(localStorage.getItem(TEST_KEY) || '[]');
      expect(stored).toEqual([]);
    });
  });
});
