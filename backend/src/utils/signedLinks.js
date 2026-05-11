/**
 * HMAC-signed download links for attachments.
 *
 * Spec §8.5:
 *   downloadUrl = /api/applications/{refNumber}/attachment/{storedAs}/signed?expires={unix}&sig={hmac}
 *   sig = HMAC-SHA256(JWT_SECRET, "${refNumber}|${storedAs}|${expires}")  (hex)
 *   expires = Math.floor(Date.now()/1000) + 300  (5 min)
 *
 * Reuses JWT_SECRET (deferred per spec §14 — dedicated SIGNED_LINK_SECRET later).
 */
import crypto from 'node:crypto';
import { config } from '../config/index.js';

export const SIGNED_LINK_TTL_SECONDS = 300; // 5 minutes

function secret() {
  return config.jwtSecret;
}

/** Build the canonical message to HMAC. */
export function canonicalString(refNumber, storedAs, expires) {
  return `${refNumber}|${storedAs}|${expires}`;
}

/** Compute the hex HMAC for a (refNumber, storedAs, expires) tuple. */
export function sign(refNumber, storedAs, expires) {
  return crypto
    .createHmac('sha256', secret())
    .update(canonicalString(refNumber, storedAs, expires))
    .digest('hex');
}

/** Build a signed download URL with default 5-min expiry. */
export function buildSignedDownloadUrl(refNumber, storedAs, { ttlSeconds = SIGNED_LINK_TTL_SECONDS, baseUrl = '' } = {}) {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = sign(refNumber, storedAs, expires);
  const encodedRef = encodeURIComponent(refNumber);
  const encodedStored = encodeURIComponent(storedAs);
  return `${baseUrl}/api/applications/${encodedRef}/attachment/${encodedStored}/signed?expires=${expires}&sig=${sig}`;
}

/**
 * Verify a signed link. Returns { ok: true } on success or
 * { ok: false, code: 'LINK_EXPIRED' | 'BAD_SIGNATURE' }.
 */
export function verifySignedLink(refNumber, storedAs, expiresRaw, sigRaw) {
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires)) {
    return { ok: false, code: 'BAD_SIGNATURE' };
  }
  if (Math.floor(Date.now() / 1000) > expires) {
    return { ok: false, code: 'LINK_EXPIRED' };
  }
  const expectedSig = sign(refNumber, storedAs, expires);
  if (typeof sigRaw !== 'string' || sigRaw.length !== expectedSig.length) {
    return { ok: false, code: 'BAD_SIGNATURE' };
  }
  // Constant-time comparison
  const a = Buffer.from(expectedSig, 'hex');
  const b = Buffer.from(sigRaw, 'hex');
  if (a.length !== b.length) return { ok: false, code: 'BAD_SIGNATURE' };
  if (!crypto.timingSafeEqual(a, b)) return { ok: false, code: 'BAD_SIGNATURE' };
  return { ok: true };
}
