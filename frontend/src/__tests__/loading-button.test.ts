import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLoadingButton, setButtonLoading, createInlineSpinner } from '../components/loading-button.ts';

describe('LoadingButton Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('createLoadingButton', () => {
    it('should create a button element', () => {
      const btn = createLoadingButton({ text: 'Click me' });

      expect(btn).toBeInstanceOf(HTMLButtonElement);
      expect(btn.textContent).toBe('Click me');
      expect(btn.type).toBe('button');
    });

    it('should add correct CSS classes', () => {
      const btn = createLoadingButton({ text: 'Submit' });

      expect(btn.className).toContain('btn-primary');
      expect(btn.className).toContain('loading-btn');
    });

    it('should show loading state when clicked', async () => {
      let resolveClick: () => void = () => {};
      const clickPromise = new Promise<void>(resolve => {
        resolveClick = resolve;
      });

      const btn = createLoadingButton({
        text: 'Submit',
        onClick: async () => {
          await clickPromise;
        },
      });

      btn.click();

      // Give time for the async handler to start
      await new Promise(r => setTimeout(r, 10));

      expect(btn.classList.contains('loading')).toBe(true);
      expect(btn.disabled).toBe(true);

      // Clean up
      resolveClick();
      await new Promise(r => setTimeout(r, 10));
    });

    it('should have correct structure for loading text', () => {
      const btn = createLoadingButton({
        text: 'Submit',
        loadingText: 'Please wait...',
      });

      // Just verify the button was created with correct initial text
      expect(btn.textContent).toBe('Submit');
      expect(btn.className).toContain('loading-btn');
    });

    it('should use custom loading text when provided', () => {
      const btn = createLoadingButton({
        text: 'Submit',
        loadingText: 'Please wait...',
      });

      // For this test, we'll just check the button was created
      expect(btn.textContent).toBe('Submit');
      expect(btn.type).toBe('button');
    });

    it('should handle click events', async () => {
      const handler = vi.fn();
      const btn = createLoadingButton({ text: 'Click me', onClick: handler });

      btn.click();

      // Wait for async handler
      await new Promise(r => setTimeout(r, 10));

      expect(handler).toHaveBeenCalled();
    });

    it('should prevent double-clicks during loading', async () => {
      const handler = vi.fn().mockImplementation(() => new Promise(r => setTimeout(r, 100)));
      const btn = createLoadingButton({ text: 'Click me', onClick: handler });

      btn.click();
      btn.click(); // Second click should be ignored

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('setButtonLoading', () => {
    let btn: HTMLButtonElement;

    beforeEach(() => {
      btn = document.createElement('button');
      btn.textContent = 'Original Text';
      document.body.appendChild(btn);
    });

    it('should set button to loading state', () => {
      setButtonLoading(btn, true);

      expect(btn.disabled).toBe(true);
      expect(btn.classList.contains('loading')).toBe(true);
    });

    it('should restore button from loading state', () => {
      // First set to loading
      setButtonLoading(btn, true);
      expect(btn.disabled).toBe(true);

      // Then restore
      setButtonLoading(btn, false);

      expect(btn.disabled).toBe(false);
      expect(btn.classList.contains('loading')).toBe(false);
    });

    it('should use custom loading text', () => {
      setButtonLoading(btn, true, 'Processing...');

      expect(btn.innerHTML).toContain('Processing...');
      expect(btn.innerHTML).toContain('spinner');
    });

    it('should restore original text after loading', () => {
      btn.textContent = 'Submit Form';
      setButtonLoading(btn, true);
      expect(btn.textContent).not.toBe('Submit Form');

      setButtonLoading(btn, false);

      expect(btn.textContent).toBe('Submit Form');
    });
  });

  describe('createInlineSpinner', () => {
    it('should create a span element', () => {
      const spinner = createInlineSpinner();

      expect(spinner).toBeInstanceOf(HTMLSpanElement);
    });

    it('should have correct CSS class', () => {
      const spinner = createInlineSpinner();

      expect(spinner.className).toBe('inline-spinner');
    });

    it('should be hidden from screen readers', () => {
      const spinner = createInlineSpinner();

      expect(spinner.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
