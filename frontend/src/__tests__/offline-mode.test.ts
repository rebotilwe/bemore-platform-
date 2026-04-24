import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Offline / Demo Mode', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Demo Mode Data Storage', () => {
    const setDemoLeads = (leads: object[]) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('demo_leads', JSON.stringify(leads));
      }
    };

    const getDemoLeads = (): object[] => {
      if (typeof localStorage === 'undefined') return [];
      const data = localStorage.getItem('demo_leads');
      return data ? JSON.parse(data) : [];
    };

    it('should store demo lead data', () => {
      setDemoLeads([{ refNumber: 'BM-DEMO-0001', userType: 'developer' }]);
      const leads = getDemoLeads();
      expect(leads.length).toBe(1);
    });

    it('should store multiple demo leads', () => {
      setDemoLeads([
        { refNumber: 'BM-DEMO-0001' },
        { refNumber: 'BM-DEMO-0002' },
      ]);
      expect(getDemoLeads().length).toBe(2);
    });

    it('should return empty array when no data', () => {
      expect(getDemoLeads()).toEqual([]);
    });
  });

  describe('Auto-save Form State', () => {
    const saveFormState = (state: object) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('form_autosave', JSON.stringify(state));
      }
    };

    const loadFormState = (): object | null => {
      if (typeof localStorage === 'undefined') return null;
      const data = localStorage.getItem('form_autosave');
      return data ? JSON.parse(data) : null;
    };

    it('should save form state', () => {
      saveFormState({ step: 2, userType: 'developer' });
      const state = loadFormState();
      expect((state as any)?.step).toBe(2);
    });

    it('should restore form state', () => {
      saveFormState({ step: 1 });
      expect((loadFormState() as any)?.step).toBe(1);
    });

    it('should return null when no saved state', () => {
      expect(loadFormState()).toBeNull();
    });
  });

  describe('Pending Sync Queue', () => {
    const queueChange = (change: object) => {
      if (typeof localStorage === 'undefined') return;
      const existing = localStorage.getItem('pending_sync');
      const queue = existing ? JSON.parse(existing) : [];
      queue.push(change);
      localStorage.setItem('pending_sync', JSON.stringify(queue));
    };

    const getQueue = (): object[] => {
      if (typeof localStorage === 'undefined') return [];
      const data = localStorage.getItem('pending_sync');
      return data ? JSON.parse(data) : [];
    };

    it('should queue changes', () => {
      queueChange({ type: 'create', data: { refNumber: 'BM-001' } });
      expect(getQueue().length).toBe(1);
    });

    it('should clear queue after sync', () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('pending_sync');
      }
      expect(getQueue().length).toBe(0);
    });
  });
});