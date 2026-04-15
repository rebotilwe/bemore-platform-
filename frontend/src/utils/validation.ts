export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/**
 * Validates South African phone numbers.
 * Accepts: 0XX XXX XXXX, +27XX XXX XXXX, 27XXXXXXXXX
 * Strips spaces, dashes, parens before validation.
 */
export function isPhone(v: string): boolean {
  const digits = v.replace(/[\s\-()]/g, '');
  // +27 or 27 prefix (9 digits after)
  if (/^\+?27\d{9}$/.test(digits)) return true;
  // Local 0XX format (10 digits)
  if (/^0\d{9}$/.test(digits)) return true;
  return false;
}

/** Normalize SA phone to +27 format for storage */
export function normalizePhone(v: string): string {
  const digits = v.replace(/[\s\-()]/g, '');
  if (/^0\d{9}$/.test(digits)) return '+27' + digits.slice(1);
  if (/^27\d{9}$/.test(digits)) return '+' + digits;
  if (/^\+27\d{9}$/.test(digits)) return digits;
  return v.trim();
}

export function minLength(v: string, min: number): boolean {
  return v.trim().length >= min;
}

export function required(v: string): boolean {
  return v.trim().length > 0;
}
