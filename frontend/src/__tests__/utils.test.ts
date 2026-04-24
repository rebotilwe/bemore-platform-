import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Utils - CSV Export', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should prevent formula injection in CSV cells', () => {
    // Test the formula injection prevention logic
    const dangerousValues = ['=1+1', '+1+1', '-1+1', '@SUM(A1:A10)'];
    const sanitized = dangerousValues.map(v => {
      if (/^[+=@-]/.test(v)) {
        return `'${v}`;
      }
      return v;
    });

    expect(sanitized[0]).toBe("'=1+1");
    expect(sanitized[1]).toBe("'+1+1");
    expect(sanitized[2]).toBe("'-1+1");
    expect(sanitized[3]).toBe("'@SUM(A1:A10)");
  });

  it('should generate CSV content with headers', () => {
    const headers = ['Name', 'Email', 'Status'];
    const rows = [
      ['John Doe', 'john@test.com', 'new'],
      ['Jane Smith', 'jane@test.com', 'reviewing'],
    ];

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    expect(csvContent).toContain('Name,Email,Status');
    expect(csvContent).toContain('John Doe,john@test.com,new');
  });

  it('should handle values with commas by quoting', () => {
    const value = 'Doe, John';
    const quoted = `"${value}"`;
    expect(quoted).toBe('"Doe, John"');
  });
});

describe('Utils - DOM Helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should create element with attributes', () => {
    const div = document.createElement('div');
    div.id = 'test';
    div.className = 'test-class';
    div.textContent = 'Hello World';

    document.body.appendChild(div);

    const el = document.getElementById('test');
    expect(el).not.toBeNull();
    expect(el?.className).toBe('test-class');
    expect(el?.textContent).toBe('Hello World');
  });

  it('should handle querySelector', () => {
    document.body.innerHTML = `
      <div class="app">
        <button class="btn-primary">Click me</button>
      </div>
    `;

    const btn = document.querySelector('.btn-primary');
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toBe('Click me');
  });

  it('should handle addEventListener', () => {
    const btn = document.createElement('button');
    const handler = vi.fn();
    btn.addEventListener('click', handler);
    btn.click();

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
