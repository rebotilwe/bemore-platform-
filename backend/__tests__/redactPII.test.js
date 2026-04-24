import { describe, it, expect } from '@jest/globals';
import { redactPII, redactEmail, redactPhone } from '../src/utils/redactPII.js';

describe('redactPII.js', () => {
  describe('redactEmail', () => {
    it('should redact email addresses', () => {
      // user 'test' (4 chars) → masked: t*** (3 stars max)
      expect(redactEmail('test@example.com')).toBe('t***@example.com');
      // user 'longusername' (12 chars) → masked: l*** (3 stars max)
      expect(redactEmail('longusername@domain.co.za')).toBe('l***@domain.co.za');
      // user 'a' (1 char) → no redaction
      expect(redactEmail('a@test.com')).toBe('a@test.com');
      expect(redactEmail(null)).toBe(null);
      expect(redactEmail(undefined)).toBe(undefined);
    });
  });

  describe('redactPhone', () => {
    it('should redact South African phone numbers', () => {
      // Standard format: +27 82 123 4567
      expect(redactPhone('+2712345678')).toBe('+27***45678'); // prefix kept, middle masked
      // 10-digit format: 082 123 4567
      expect(redactPhone('0821234567')).toBe('0***4567');
      expect(redactPhone('not-a-phone')).toBe('not-a-phone');
    });
  });

  describe('redactPII', () => {
    it('should redact PII in strings', () => {
      const input = 'Contact test@example.com or +2712345678';
      const result = redactPII(input);
      expect(result).toContain('t***@example.com');
      expect(result).toContain('+27******5678');
    });

    it('should redact PII in objects', () => {
      const input = {
        name: 'John',
        email: 'john@example.com',
        phone: '0821234567',
        password: 'secret123',
        nested: {
          token: 'abc123',
          ip: '192.168.1.1'
        },
        array: ['test@example.com', '0821111111']
      };
      const result = redactPII(input);
      expect(result.email).toBe('j***@example.com');
      expect(result.phone).toBe('082*****4567');
      expect(result.password).toBe('[REDACTED]');
      expect(result.nested.token).toBe('[REDACTED]');
      expect(result.nested.ip).toBe('192.168.*.*');
      expect(result.array[0]).toContain('*@example.com');
    });

    it('should redact SA ID numbers', () => {
      const input = 'ID: 1234567890123';
      const result = redactPII(input);
      // ID 1234567890123 → ******7890*** (first 6 masked + last 3 masked)
      expect(result).toContain('******7890***');
    });

    it('should redact IPv6 addresses', () => {
      const input = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const result = redactPII(input);
      expect(result).toBe('[REDACTED_IPv6]');
    });

    it('should handle non-string/non-object input', () => {
      expect(redactPII(123)).toBe(123);
      expect(redactPII(null)).toBe(null);
      expect(redactPII(undefined)).toBe(undefined);
    });

    it('should prevent infinite recursion', () => {
      const obj = { a: 1 };
      obj.self = obj;
      expect(() => redactPII(obj)).not.toThrow();
    });
  });
});
