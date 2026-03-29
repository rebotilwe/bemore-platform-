import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, generateRefNumber } from '../utils/format';

describe('Format Utils', () => {
  describe('formatDate', () => {
    it('should format ISO date string correctly', () => {
      const result = formatDate('2026-03-15T10:30:00.000Z');
      expect(result).toMatch(/\d{1,2}\s+\w{3}\s+\d{4}/);
    });

    it('should handle date with time', () => {
      const result = formatDate('2026-03-28T14:30:00.000Z');
      expect(result).toContain('2026');
    });
  });

  describe('formatDateTime', () => {
    it('should format ISO date string with time', () => {
      const result = formatDateTime('2026-03-15T10:30:00.000Z');
      expect(result).toMatch(/\d{1,2}\s+\w{3}\s+\d{4}/);
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('generateRefNumber', () => {
    it('should generate reference number with BM- prefix', () => {
      const ref = generateRefNumber();
      expect(ref).toMatch(/^BM-\d{4}-\d{4}$/);
    });

    it('should include current year', () => {
      const ref = generateRefNumber();
      const currentYear = new Date().getFullYear();
      expect(ref).toContain(String(currentYear));
    });

    it('should generate unique reference numbers', () => {
      const refs = new Set();
      for (let i = 0; i < 100; i++) {
        refs.add(generateRefNumber());
      }
      expect(refs.size).toBeGreaterThanOrEqual(95);
    });
  });
});
