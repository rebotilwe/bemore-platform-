import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { $, $$, byId, inputVal, setHtml, setError } from '../utils/dom.ts';

describe('DOM Utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('$ (query selector)', () => {
    it('should return element when found', () => {
      document.body.innerHTML = '<div id="test">Hello</div>';

      const el = $('#test');
      expect(el).not.toBeNull();
      expect(el?.textContent).toBe('Hello');
    });

    it('should return null when element not found', () => {
      const el = $('#nonexistent');
      expect(el).toBeNull();
    });

    it('should query within parent element', () => {
      document.body.innerHTML = `
        <div class="parent">
          <span class="child">Child 1</span>
        </div>
        <span class="child">Child 2</span>
      `;

      const parent = document.querySelector('.parent')!;
      const child = $('.child', parent);
      expect(child?.textContent).toBe('Child 1');
    });

    it('should return null when parent has no match', () => {
      document.body.innerHTML = '<div id="parent"></div>';
      const parent = document.getElementById('parent')!;
      const el = $('.child', parent);
      expect(el).toBeNull();
    });
  });

  describe('$$ (querySelectorAll)', () => {
    it('should return all matching elements', () => {
      document.body.innerHTML = `
        <div class="item">1</div>
        <div class="item">2</div>
        <div class="item">3</div>
      `;

      const items = $$('.item');
      expect(items).toHaveLength(3);
    });

    it('should return empty array when no matches', () => {
      const items = $$('.nonexistent');
      expect(items).toEqual([]);
    });

    it('should query within parent element', () => {
      document.body.innerHTML = `
        <div class="parent">
          <span class="child">1</span>
          <span class="child">2</span>
        </div>
        <span class="child">3</span>
      `;

      const parent = document.querySelector('.parent')!;
      const children = $$('.child', parent);
      expect(children).toHaveLength(2);
    });
  });

  describe('byId', () => {
    it('should return element when found', () => {
      document.body.innerHTML = '<div id="myElement">Content</div>';

      const el = byId('myElement');
      expect(el).toBeInstanceOf(HTMLElement);
      expect(el.textContent).toBe('Content');
    });

    it('should throw error when element not found', () => {
      expect(() => byId('nonexistent')).toThrow('Element #nonexistent not found');
    });
  });

  describe('inputVal', () => {
    it('should return trimmed input value', () => {
      document.body.innerHTML = '<input id="myInput" value="  test value  " />';

      const val = inputVal('myInput');
      expect(val).toBe('test value');
    });

    it('should return empty string when input not found', () => {
      const val = inputVal('nonexistent');
      expect(val).toBe('');
    });

    it('should return empty string when value is undefined', () => {
      document.body.innerHTML = '<div id="notInput"></div>';

      const val = inputVal('notInput');
      expect(val).toBe('');
    });
  });

  describe('setHtml', () => {
    it('should set innerHTML of element', () => {
      document.body.innerHTML = '<div id="target"></div>';

      setHtml('target', '<span>New Content</span>');

      const el = document.getElementById('target')!;
      expect(el.innerHTML).toBe('<span>New Content</span>');
    });

    it('should not throw when element not found', () => {
      expect(() => setHtml('nonexistent', 'content')).not.toThrow();
    });

    it('should handle empty HTML string', () => {
      document.body.innerHTML = '<div id="target">Old Content</div>';

      setHtml('target', '');

      const el = document.getElementById('target')!;
      expect(el.innerHTML).toBe('');
    });
  });

  describe('setError', () => {
    it('should add error class when hasError is true', () => {
      document.body.innerHTML = '<div id="field"></div>';

      setError('field', true);

      const el = document.getElementById('field')!;
      expect(el.classList.contains('err')).toBe(true);
    });

    it('should remove error class when hasError is false', () => {
      document.body.innerHTML = '<div id="field" class="err"></div>';

      setError('field', false);

      const el = document.getElementById('field')!;
      expect(el.classList.contains('err')).toBe(false);
    });

    it('should not throw when element not found', () => {
      expect(() => setError('nonexistent', true)).not.toThrow();
    });

    it('should toggle error class correctly', () => {
      document.body.innerHTML = '<div id="field"></div>';
      const el = document.getElementById('field')!;

      setError('field', true);
      expect(el.classList.contains('err')).toBe(true);

      setError('field', false);
      expect(el.classList.contains('err')).toBe(false);

      setError('field', true);
      expect(el.classList.contains('err')).toBe(true);
    });
  });
});
