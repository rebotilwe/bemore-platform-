/**
 * Supabase Storage helper — private bucket for compliance documents.
 *
 * Uses the SERVICE ROLE key (never the public/anon key) so the backend can
 * read/write a private bucket directly, bypassing RLS. Files are only ever
 * exposed to clients via short-lived signed URLs — never made public.
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 *   SUPABASE_DOCUMENTS_BUCKET (default: 'bemore-documents')
 */
import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const SUPABASE_BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET || 'bemore-documents';

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
} else {
  logger.warn('Supabase storage not configured — SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing. Document uploads will fail.');
}

export function isConfigured() {
  return Boolean(supabase);
}

/** Upload a buffer to the bucket at the given object path (e.g. "documents/<uuid>.pdf"). */
export async function uploadObject(objectPath, buffer, mimeType) {
  if (!supabase) throw new Error('Supabase storage not configured');
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(objectPath, buffer, {
    contentType: mimeType || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw error;
}

/** Check whether an object exists, returning its size (bytes) if found. */
export async function objectStat(objectPath) {
  if (!supabase) return { exists: false, size: 0 };
  const lastSlash = objectPath.lastIndexOf('/');
  const dir = lastSlash >= 0 ? objectPath.slice(0, lastSlash) : '';
  const name = lastSlash >= 0 ? objectPath.slice(lastSlash + 1) : objectPath;
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).list(dir, { search: name });
  if (error) {
    logger.warn('Supabase list() failed while checking existence', { objectPath, error: error.message });
    return { exists: false, size: 0 };
  }
  const found = Array.isArray(data) ? data.find((f) => f.name === name) : null;
  if (!found) return { exists: false, size: 0 };
  return { exists: true, size: found.metadata?.size ?? 0 };
}

/** Back-compat boolean-only existence check. */
export async function objectExists(objectPath) {
  const stat = await objectStat(objectPath);
  return stat.exists;
}

/** Generate a short-lived signed URL for downloading a private object. */
export async function createSignedUrl(objectPath, expiresInSeconds = 60) {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).createSignedUrl(objectPath, expiresInSeconds);
  if (error) {
    logger.warn('Supabase createSignedUrl() failed', { objectPath, error: error.message });
    return null;
  }
  return data?.signedUrl || null;
}

/** Delete an object from the bucket. Returns true on success. */
export async function deleteObject(objectPath) {
  if (!supabase) return false;
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove([objectPath]);
  if (error) {
    logger.warn('Supabase delete failed', { objectPath, error: error.message });
    return false;
  }
  return true;
}

/** Fetch an object's bytes via a signed URL (used to proxy downloads through our own API). */
export async function fetchObjectBuffer(objectPath) {
  const url = await createSignedUrl(objectPath, 60);
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}