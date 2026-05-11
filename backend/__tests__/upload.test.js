/**
 * BE-2 — POST /api/applications/upload tests
 * Covers spec §8.1 acceptance criteria + all 6 error codes.
 */
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import request from 'supertest';

// Set UPLOAD_DIR before importing the app/services so the multer instance picks it up.
const UPLOAD_DIR = await fsp.mkdtemp(path.join(os.tmpdir(), 'bemore-upload-'));
process.env.UPLOAD_DIR = UPLOAD_DIR;

const { createApp } = await import('../src/app.js');
const { CV_DIR, ensureUploadDirs } = await import('../src/services/uploadService.js');

const app = createApp();

beforeAll(() => {
  ensureUploadDirs();
});

afterAll(async () => {
  // Clean tmp dir
  try {
    await fsp.rm(UPLOAD_DIR, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

// Public CSRF cookie/token — the existing csrfProtection middleware does a
// double-submit check. We mint a matching pair for tests.
const CSRF_TOKEN = 'test-csrf-token-12345';
const CSRF_COOKIE = `bm_csrf=${CSRF_TOKEN}`;

const PDF_BYTES = Buffer.from('%PDF-1.4\n%test pdf body\n%%EOF\n');

describe('POST /api/applications/upload — spec §8.1', () => {
  it('returns 200 with {filename, storedAs, size, mimeType} on valid PDF', async () => {
    const res = await request(app)
      .post('/api/applications/upload')
      .set('Cookie', CSRF_COOKIE)
      .set('X-CSRF-Token', CSRF_TOKEN)
      .attach('file', PDF_BYTES, { filename: 'alex-soko-cv.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('filename', 'alex-soko-cv.pdf');
    expect(res.body).toHaveProperty('storedAs');
    expect(res.body).toHaveProperty('size', PDF_BYTES.length);
    expect(res.body).toHaveProperty('mimeType', 'application/pdf');

    // storedAs should be UUID v4 + .pdf
    expect(res.body.storedAs).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i);

    // File on disk
    const onDisk = path.join(CV_DIR, res.body.storedAs);
    const stat = await fsp.stat(onDisk);
    expect(stat.isFile()).toBe(true);

    // mode 0o644 (low 9 bits)
    expect(stat.mode & 0o777).toBe(0o644);
  });

  it('sanitises filename to [a-zA-Z0-9 ._-]', async () => {
    const res = await request(app)
      .post('/api/applications/upload')
      .set('Cookie', CSRF_COOKIE)
      .set('X-CSRF-Token', CSRF_TOKEN)
      .attach('file', PDF_BYTES, { filename: '../../etc/p@ss<word>.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    // basename strips path traversal, then sanitiser strips < > @ — leaving "pssword.pdf"
    expect(res.body.filename).toBe('pssword.pdf');
  });

  it('returns 400 NO_FILE when no file in request', async () => {
    const res = await request(app)
      .post('/api/applications/upload')
      .set('Cookie', CSRF_COOKIE)
      .set('X-CSRF-Token', CSRF_TOKEN)
      .field('foo', 'bar');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_FILE');
  });

  it('returns 400 FILE_TOO_LARGE for files > 5 MB', async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 100, 'A');
    const res = await request(app)
      .post('/api/applications/upload')
      .set('Cookie', CSRF_COOKIE)
      .set('X-CSRF-Token', CSRF_TOKEN)
      .attach('file', big, { filename: 'big.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('FILE_TOO_LARGE');
  });

  it('returns 400 INVALID_MIME_TYPE for image/png', async () => {
    const res = await request(app)
      .post('/api/applications/upload')
      .set('Cookie', CSRF_COOKIE)
      .set('X-CSRF-Token', CSRF_TOKEN)
      .attach('file', Buffer.from('fake png'), { filename: 'pic.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_MIME_TYPE');
  });

  it('returns 403 without CSRF token/cookie', async () => {
    const res = await request(app)
      .post('/api/applications/upload')
      .attach('file', PDF_BYTES, { filename: 'cv.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(403);
  });

  it('accepts application/msword (.doc)', async () => {
    const res = await request(app)
      .post('/api/applications/upload')
      .set('Cookie', CSRF_COOKIE)
      .set('X-CSRF-Token', CSRF_TOKEN)
      .attach('file', Buffer.from('fake doc bytes'), { filename: 'cv.doc', contentType: 'application/msword' });

    expect(res.status).toBe(200);
    expect(res.body.mimeType).toBe('application/msword');
    expect(res.body.storedAs).toMatch(/\.doc$/);
  });

  it('accepts application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx)', async () => {
    const res = await request(app)
      .post('/api/applications/upload')
      .set('Cookie', CSRF_COOKIE)
      .set('X-CSRF-Token', CSRF_TOKEN)
      .attach('file', Buffer.from('fake docx bytes'), {
        filename: 'cv.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

    expect(res.status).toBe(200);
    expect(res.body.storedAs).toMatch(/\.docx$/);
  });

  it('does not write a DB record (no Application persisted from upload)', async () => {
    const Application = (await import('../src/models/Application.js')).default;
    const before = await Application.countDocuments();
    await request(app)
      .post('/api/applications/upload')
      .set('Cookie', CSRF_COOKIE)
      .set('X-CSRF-Token', CSRF_TOKEN)
      .attach('file', PDF_BYTES, { filename: 'no-db.pdf', contentType: 'application/pdf' });
    const after = await Application.countDocuments();
    expect(after).toBe(before);
  });

  it('generates unique storedAs for concurrent uploads of same filename', async () => {
    const [r1, r2] = await Promise.all([
      request(app)
        .post('/api/applications/upload')
        .set('Cookie', CSRF_COOKIE)
        .set('X-CSRF-Token', CSRF_TOKEN)
        .attach('file', PDF_BYTES, { filename: 'same.pdf', contentType: 'application/pdf' }),
      request(app)
        .post('/api/applications/upload')
        .set('Cookie', CSRF_COOKIE)
        .set('X-CSRF-Token', CSRF_TOKEN)
        .attach('file', PDF_BYTES, { filename: 'same.pdf', contentType: 'application/pdf' }),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.body.storedAs).not.toBe(r2.body.storedAs);
  });
});
