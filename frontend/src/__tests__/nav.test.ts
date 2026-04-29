import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderNav, mountNav, initNavScroll } from '../components/nav.ts';

describe('Nav Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('renderNav', () => {
    it('should render navigation HTML', () => {
      const html = renderNav('/');

      expect(html).toContain('nav');
      expect(html).toContain('main-nav');
      expect(html).toContain('BeMore Group');
    });

    it('should include logo image', () => {
      const html = renderNav('/');

      expect(html).toContain('be-more-group-logo.png');
      expect(html).toContain('alt="BeMore Group"');
    });

    it('should include navigation links', () => {
      const html = renderNav('/');

      expect(html).toContain('About Us');
      expect(html).toContain('My Status');
      expect(html).toContain('Apply Now');
    });

    it('should include data-track attributes', () => {
      const html = renderNav('/');

      expect(html).toContain('data-track');
    });

    it('should include burger menu button', () => {
      const html = renderNav('/');

      expect(html).toContain('nav-burger');
      expect(html).toContain('Toggle menu');
      expect(html).toContain('aria-expanded="false"');
    });
  });

  describe('mountNav', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <nav id="main-nav">
          <button id="nav-burger" aria-expanded="false"></button>
          <div id="nav-actions">
            <a class="nav-link" href="#/about">About</a>
          </div>
        </nav>
      `;
    });

    it('should add click listener to burger button', () => {
      const burger = document.getElementById('nav-burger')!;
      const actions = document.getElementById('nav-actions')!;

      mountNav();

      // Simulate click
      burger.click();

      expect(actions.classList.contains('open')).toBe(true);
      expect(burger.classList.contains('open')).toBe(true);
      expect(burger.getAttribute('aria-expanded')).toBe('true');
    });

    it('should close menu when nav link is clicked', () => {
      const burger = document.getElementById('nav-burger')!;
      const actions = document.getElementById('nav-actions')!;
      const link = actions.querySelector('.nav-link') as HTMLElement;

      mountNav();

      // First open menu
      burger.click();
      expect(actions.classList.contains('open')).toBe(true);

      // Then click link
      link.click();
      expect(actions.classList.contains('open')).toBe(false);
    });

    it('should not throw when elements are missing', () => {
      document.body.innerHTML = '';
      expect(() => mountNav()).not.toThrow();
    });
  });

  describe('initNavScroll', () => {
    it('should not throw when called', () => {
      expect(() => initNavScroll()).not.toThrow();
    });
  });
});
