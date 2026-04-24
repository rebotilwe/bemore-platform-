/**
 * PII Redaction Utility — POPIA Compliance
 *
 * Redacts personally identifiable information before logging or storing:
 * - Email addresses: user@example.com → u***@example.com
 * - Phone numbers (+27): +27123456789 → +27*****6789
 * - SA ID numbers: 1234567890123 → ******1234***
 * - IP addresses: 192.168.1.1 → 192.168.*.*
 * - Passwords, tokens: replaced with [REDACTED]
 *
 * Bukani Tech Standard: PII Redaction (POPIA Mandatory)
 */

const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/g;
const SA_PHONE_REGEX = /(\+27|0)(\d+)(\d{4})/g;
const SA_ID_REGEX = /\d{13}/g;
const IPV4_REGEX = /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g;
const IPV6_REGEX = /\b([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g;
const PASSWORD_TOKEN_KEYS = ['password', 'pass', 'pwd', 'token', 'secret', 'apiKey', 'api_key', 'jwt', 'accessToken', 'refreshToken'];

/**
 * Redact email addresses in a string
 */
function redactEmails(str) {
  return str.replace(EMAIL_REGEX, (match, user, domain) => {
    if (user.length <= 1) return match;
    const masked = user[0] + '*'.repeat(Math.min(user.length - 1, 3));
    return `${masked}@${domain}`;
  });
}

/**
 * Redact South African phone numbers in a string
 * Handles: +27XXXXXXXXXXX (9-11 digits), 0XXXXXXXXXX (8-10 digits)
 * Keeps last 4 digits visible, masks the rest
 */
function redactPhones(str) {
  return str.replace(SA_PHONE_REGEX, (match, prefix, middle, last4) => {
    return prefix + '*'.repeat(middle.length) + last4;
  });
}

/**
 * Redact South African ID numbers in a string
 * SA ID: 13 digits - YYMMDDSSSSCCC
 * Masks first 6 (birth date) and last 3 (citizenship), keeps 4 in middle (serial)
 */
function redactSAIDs(str) {
  return str.replace(SA_ID_REGEX, (match) => {
    // match is 13 digits: YYMMDDSSSSCCC
    // We mask first 6 + last 3, keep 4 middle
    return '*'.repeat(6) + match.slice(6, 10) + '*'.repeat(3);
  });
}

/**
 * Redact IPv4 addresses in a string
 */
function redactIPv4(str) {
  return str.replace(IPV4_REGEX, (match, oct1, oct2, oct3, oct4) => {
    return `${oct1}.${oct2}.*.*`;
  });
}

/**
 * Redact IPv6 addresses in a string
 */
function redactIPv6(str) {
  return str.replace(IPV6_REGEX, (match) => {
    return '[REDACTED_IPv6]';
  });
}

/**
 * Redact sensitive keys in an object
 */
function redactSensitiveKeys(obj, depth = 0) {
  if (depth > 10) return obj; // Prevent infinite recursion

  if (typeof obj === 'string') {
    return redactEmails(redactPhones(redactSAIDs(redactIPv4(redactIPv6(obj)))));
  }

  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveKeys(item, depth + 1));
  }

  // Handle objects
  const redacted = { ...obj };
  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();

    // Check if this key contains sensitive data
    if (PASSWORD_TOKEN_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'string') {
      redacted[key] = redactEmails(redactPhones(redactSAIDs(redactIPv4(redactIPv6(redacted[key])))));
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveKeys(redacted[key], depth + 1);
    }
  }

  return redacted;
}

/**
 * Redact PII from a string or object
 * @param {string|object} input - The input to redact
 * @returns {string|object} - The redacted output
 */
export function redactPII(input) {
  if (typeof input === 'string') {
    return redactEmails(redactPhones(redactSAIDs(redactIPv4(redactIPv6(input)))));
  }

  if (typeof input === 'object' && input !== null) {
    return redactSensitiveKeys(input);
  }

  return input;
}

/**
 * Redact email specifically for logging (shorter mask)
 */
export function redactEmail(email) {
  if (!email || typeof email !== 'string') return email;
  return redactEmails(email);
}

/**
 * Redact phone number specifically for logging
 */
export function redactPhone(phone) {
  if (!phone || typeof phone !== 'string') return phone;
  return redactPhones(phone);
}

export default redactPII;