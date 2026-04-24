import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { toast } from '../components/toast.ts';

describe('Toast Component', () => {
  let toastEl: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="toast"></div>';
    toastEl = document.getElementById('toast')!;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('toast', () => {
    it('should set text content of toast element', () => {
      toast('Test message');

      expect(toastEl.textContent).toBe('Test message');
    });

    it('should add show class to toast element', () => {
      toast('Hello World');

      expect(toastEl.classList.contains('show')).toBe(true);
    });

    it('should clear previous timeout when called again', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      toast('First message');
      toast('Second message');

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should remove show class after timeout', async () => {
      vi.useFakeTimers();

      toast('Test message');
      expect(toastEl.classList.contains('show')).toBe(true);

      // Fast-forward past the timeout (3200ms)
      vi.advanceTimersByTime(3200);

      expect(toastEl.classList.contains('show')).toBe(false);

      vi.useRealTimers();
    });

    it('should not throw when toast element does not exist', () => {
      document.body.innerHTML = ''; // Remove the toast element

      expect(() => toast('Test')).not.toThrow();
    });
  });
});
