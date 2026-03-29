import { describe, it, expect } from 'vitest';
import { isEmail, isPhone, minLength, required } from '../utils/validation';

describe('Validation Utils', () => {
  describe('isEmail', () => {
    it('should return true for valid emails', () => {
      expect(isEmail('test@example.com')).toBe(true);
      expect(isEmail('user.name@domain.co.za')).toBe(true);
      expect(isEmail('user+tag@example.org')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isEmail('invalid')).toBe(false);
      expect(isEmail('invalid@')).toBe(false);
      expect(isEmail('@domain.com')).toBe(false);
      expect(isEmail('user@domain')).toBe(false);
      expect(isEmail('')).toBe(false);
    });
  });

  describe('isPhone', () => {
    it('should return true for valid SA phone numbers', () => {
      expect(isPhone('+27721234567')).toBe(true);
      expect(isPhone('+27821234567')).toBe(true);
      expect(isPhone('0712345678')).toBe(true);
      expect(isPhone('082 123 4567')).toBe(true);
      expect(isPhone('+27 72 123 4567')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(isPhone('123')).toBe(false);
      expect(isPhone('abcdefghij')).toBe(false);
      expect(isPhone('')).toBe(false);
    });
  });

  describe('minLength', () => {
    it('should return true when string meets minimum length', () => {
      expect(minLength('hello', 3)).toBe(true);
      expect(minLength('hi', 2)).toBe(true);
      expect(minLength('', 0)).toBe(true);
    });

    it('should return false when string is below minimum length', () => {
      expect(minLength('hi', 3)).toBe(false);
      expect(minLength('', 1)).toBe(false);
    });

    it('should trim whitespace before checking', () => {
      expect(minLength('  hi  ', 2)).toBe(true);
      expect(minLength(' a ', 1)).toBe(true);
    });
  });

  describe('required', () => {
    it('should return true for non-empty strings', () => {
      expect(required('hello')).toBe(true);
      expect(required('a')).toBe(true);
    });

    it('should return false for empty or whitespace strings', () => {
      expect(required('')).toBe(false);
      expect(required('   ')).toBe(false);
      expect(required('\n')).toBe(false);
    });
  });
});
