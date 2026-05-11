/**
 * BE-4 — GET / DELETE / signed-link attachment endpoints (spec §8.3, §8.4, §8.5, §8.6)
 *
 * These tests rely on UPLOAD_DIR being a writable temp dir. We set it before
 * importing app/services so the multer instance + cvPath() resolve correctly.
 */
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import request from 'supertest';
import bcrypt from 'bcryptjs';

const UPLOAD_DIR = await fsp.mkdtemp(path.join(os.tmpdir(), 'bemore-att-'));
process.env.UPLOAD_DIR = UPLOAD_DIR;

const { createApp } = await import('../src/app.js');
const { CV_DIR, ensureUploadDirs } = await import('../src/services/uploadService.js');
const { buildSignedDownloadUrl, sign } = await import('../src/utils/signedLinks.js');
const { default: Application } = await import('../src/models/Application.js');
const { default: Admin } = await import('../src/models/Admin.js');
const { default: AdminAuditLog } = await import('../src/models/AdminAuditLog.js');

const app = createApp();

beforeAll(() => {
  ensureUploadDirs();
});

afterAll(async () => {
  try {
    await fsp.rm(UPLOAD_DIR, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

afterEach(async () => {
  await Application.deleteMany({});
  await Admin.deleteMany({});
  await AdminAuditLog.deleteMany({});
});

const PDF_BYTES = Buffer.from('%PDF-1.4\nfake CV body for tests\n%%EOF\n');

async function createAdminAndLogin() {
  const hashed = await bcrypt.hash('TestPass123!', 10);
  await Admin.create({ email: 'attach-admin@bemore.co.za', password: hashed });
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'attach-admin@bemore.co.za', password: 'TestPass123!' });
  const cookies = login.headers['set-cookie'] || [];
  const authCookie = cookies.find((c) => c.startsWith('bm_token=')) || '';
  const csrfCookie = cookies.find((c) => c.startsWith('bm_csrf=')) || '';
  const csrfToken = login.body.data?.csrfToken || '';
  return { authCookie, csrfCookie, csrfToken };
}

async function writeFakeCv(name, body = PDF_BYTES) {
  const target = path.join(CV_DIR, name);
  await fsp.writeFile(target, body);
  return name;
}

async function makeApplicationWithCv(name = 'cv-fixture-aa11.pdf') {
  const stored = await writeFakeCv(name);
  const baseApp = {
    userType: 'professional',
    personal: {
      firstName: 'Alex',
      surname: 'Soko',
      email: `alex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
      phone: '+27821234567',
    },
    formData: {},
    attachments: [{ field: 'cv', storedAs: stored, filename: 'alex-soko-cv.pdf' }],
    consent: { tc: true, popia: true },
  };
  const res = await request(app).post('/api/applications').send(baseApp);
  expect(res.status).toBe(201);
  return { refNumber: res.body.data.refNumber, storedAs: stored, email: baseApp.personal.email };
}

// ─── §8.3 GET /attachment ─────────────────────────────────────────────────────

describe('GET /api/applications/:refNumber/attachment/:storedAs (admin) — spec §8.3', () => {
  it('200 + correct file bytes + Content-Disposition with original filename', async () => {
    const { authCookie } = await createAdminAndLogin();
    const { refNumber, storedAs } = await makeApplicationWithCv();

    const res = await request(app)
      .get(`/api/applications/${refNumber}/attachment/${storedAs}`)
      .set('Cookie', authCookie)
      .buffer(true)
      .parse((response, cb) => {
        const chunks = [];
        response.on('data', (c) => chunks.push(c));
        response.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment; filename="alex-soko-cv.pdf"');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.equals(PDF_BYTES)).toBe(true);
  });

  it('401 for non-admin (no JWT)', async () => {
    const { refNumber, storedAs } = await makeApplicationWithCv();
    const res = await request(app)
      .get(`/api/applications/${refNumber}/attachment/${storedAs}`);
    expect(res.status).toBe(401);
  });

  it('404 APPLICATION_NOT_FOUND for unknown refNumber', async () => {
    const { authCookie } = await createAdminAndLogin();
    const res = await request(app)
      .get('/api/applications/BM-NOSUCH00/attachment/anything.pdf')
      .set('Cookie', authCookie);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('404 ATTACHMENT_NOT_FOUND for unknown storedAs', async () => {
    const { authCookie } = await createAdminAndLogin();
    const { refNumber } = await makeApplicationWithCv();
    const res = await request(app)
      .get(`/api/applications/${refNumber}/attachment/missing-stored-as.pdf`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ATTACHMENT_NOT_FOUND');
  });

  it('410 FILE_MISSING_ON_DISK when DB references a file that no longer exists', async () => {
    const { authCookie } = await createAdminAndLogin();
    const { refNumber, storedAs } = await makeApplicationWithCv();
    // Wipe the file from disk but keep the DB ref
    await fsp.unlink(path.join(CV_DIR, storedAs));
    const res = await request(app)
      .get(`/api/applications/${refNumber}/attachment/${storedAs}`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('FILE_MISSING_ON_DISK');
  });

  it('writes one AdminAuditLog entry per successful download', async () => {
    const { authCookie } = await createAdminAndLogin();
    const { refNumber, storedAs } = await makeApplicationWithCv();

    const before = await AdminAuditLog.countDocuments({ action: 'attachment.download' });
    const res = await request(app)
      .get(`/api/applications/${refNumber}/attachment/${storedAs}`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    // Allow async audit log to land
    await new Promise((r) => setTimeout(r, 50));
    const after = await AdminAuditLog.countDocuments({ action: 'attachment.download' });
    expect(after).toBe(before + 1);
  });
});

// ─── §8.4 DELETE /attachment ─────────────────────────────────────────────────

describe('DELETE /api/applications/:refNumber/attachment/:storedAs (admin) — spec §8.4', () => {
  it('removes file + DB entry + writes audit log (204)', async () => {
    const { authCookie, csrfToken } = await createAdminAndLogin();
    const { refNumber, storedAs } = await makeApplicationWithCv();

    const res = await request(app)
      .delete(`/api/applications/${refNumber}/attachment/${storedAs}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(204);

    // File gone from disk
    await expect(fsp.stat(path.join(CV_DIR, storedAs))).rejects.toThrow();
    // DB entry gone
    const saved = await Application.findOne({ refNumber });
    expect(saved.attachments).toHaveLength(0);
    // Audit log written
    await new Promise((r) => setTimeout(r, 50));
    const log = await AdminAuditLog.findOne({ action: 'attachment.delete', 'target.refNumber': refNumber });
    expect(log).not.toBeNull();
  });

  it('idempotent: deleting an already-deleted attachment returns 404', async () => {
    const { authCookie, csrfToken } = await createAdminAndLogin();
    const { refNumber, storedAs } = await makeApplicationWithCv();

    // First delete
    await request(app)
      .delete(`/api/applications/${refNumber}/attachment/${storedAs}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);

    // Second delete
    const res = await request(app)
      .delete(`/api/applications/${refNumber}/attachment/${storedAs}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ATTACHMENT_NOT_FOUND');
  });

  it('disk delete failure does not block DB delete (file already missing)', async () => {
    const { authCookie, csrfToken } = await createAdminAndLogin();
    const { refNumber, storedAs } = await makeApplicationWithCv();

    // Remove file behind the controller's back
    await fsp.unlink(path.join(CV_DIR, storedAs));

    const res = await request(app)
      .delete(`/api/applications/${refNumber}/attachment/${storedAs}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(204);

    // DB entry still removed even though file was already gone
    const saved = await Application.findOne({ refNumber });
    expect(saved.attachments).toHaveLength(0);
  });

  it('401 for non-admin', async () => {
    const { refNumber, storedAs } = await makeApplicationWithCv();
    const res = await request(app)
      .delete(`/api/applications/${refNumber}/attachment/${storedAs}`);
    expect(res.status).toBe(401);
  });
});

// ─── §8.5 Signed-link download ───────────────────────────────────────────────

describe('GET /api/applications/:refNumber/attachment/:storedAs/signed (public) — spec §8.5', () => {
  it('200 within 5 minutes of issue + correct bytes', async () => {
    const { refNumber, storedAs } = await makeApplicationWithCv();
    const url = buildSignedDownloadUrl(refNumber, storedAs);
    const pathOnly = url.replace(/^[^/]*/, ''); // strip baseUrl (empty here)

    const res = await request(app)
      .get(pathOnly)
      .buffer(true)
      .parse((response, cb) => {
        const chunks = [];
        response.on('data', (c) => chunks.push(c));
        response.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment; filename="alex-soko-cv.pdf"');
    expect(res.body.equals(PDF_BYTES)).toBe(true);
  });

  it('410 LINK_EXPIRED after 5 minutes', async () => {
    const { refNumber, storedAs } = await makeApplicationWithCv();
    const expires = Math.floor(Date.now() / 1000) - 60; // 1 min in the past
    const sig = sign(refNumber, storedAs, expires);
    const res = await request(app)
      .get(`/api/applications/${refNumber}/attachment/${storedAs}/signed?expires=${expires}&sig=${sig}`);
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('LINK_EXPIRED');
  });

  it('403 BAD_SIGNATURE when signature is tampered', async () => {
    const { refNumber, storedAs } = await makeApplicationWithCv();
    const expires = Math.floor(Date.now() / 1000) + 300;
    const goodSig = sign(refNumber, storedAs, expires);
    const badSig = goodSig.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'));
    const res = await request(app)
      .get(`/api/applications/${refNumber}/attachment/${storedAs}/signed?expires=${expires}&sig=${badSig}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('BAD_SIGNATURE');
  });

  it('403 BAD_SIGNATURE when expires is tampered', async () => {
    const { refNumber, storedAs } = await makeApplicationWithCv();
    const expires = Math.floor(Date.now() / 1000) + 300;
    const sig = sign(refNumber, storedAs, expires);
    // Bump expires by 60s — sig now invalid
    const res = await request(app)
      .get(`/api/applications/${refNumber}/attachment/${storedAs}/signed?expires=${expires + 60}&sig=${sig}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('BAD_SIGNATURE');
  });

  it('writes one AdminAuditLog entry per signed download (action attachment.signed-download)', async () => {
    const { refNumber, storedAs } = await makeApplicationWithCv();
    const url = buildSignedDownloadUrl(refNumber, storedAs);
    const before = await AdminAuditLog.countDocuments({ action: 'attachment.signed-download' });
    await request(app).get(url);
    await new Promise((r) => setTimeout(r, 50));
    const after = await AdminAuditLog.countDocuments({ action: 'attachment.signed-download' });
    expect(after).toBe(before + 1);

    const log = await AdminAuditLog.findOne({ action: 'attachment.signed-download', 'target.refNumber': refNumber });
    expect(log.admin.email).toBe('self-service');
    expect(log.details.actor).toBe('self-service');
  });

  it('does NOT require auth or CSRF', async () => {
    // Same test as the happy path, but explicit: no Cookie header at all.
    const { refNumber, storedAs } = await makeApplicationWithCv();
    const url = buildSignedDownloadUrl(refNumber, storedAs);
    const res = await request(app).get(url);
    expect(res.status).toBe(200);
  });
});

// ─── §8.5 data-export with signed links ──────────────────────────────────────

describe('POST /api/applications/data-export — spec §8.5 (signed links)', () => {
  it('returns attachments[] with downloadUrl that is honoured', async () => {
    const { refNumber, storedAs, email } = await makeApplicationWithCv();

    const res = await request(app)
      .post('/api/applications/data-export')
      .send({ refNumber, email });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.attachments)).toBe(true);
    expect(res.body.data.attachments).toHaveLength(1);
    const att = res.body.data.attachments[0];
    expect(att.storedAs).toBe(storedAs);
    expect(att.filename).toBe('alex-soko-cv.pdf');
    expect(att.downloadUrl).toMatch(/\/signed\?expires=\d+&sig=[a-f0-9]{64}$/);

    // Hit the URL to confirm it works
    const signedRes = await request(app).get(att.downloadUrl);
    expect(signedRes.status).toBe(200);
  });
});

// ─── §8.6 data-delete removes files ──────────────────────────────────────────

describe('POST /api/applications/data-delete — spec §8.6', () => {
  it('removes both DB record and attachment files from disk', async () => {
    const { refNumber, storedAs, email } = await makeApplicationWithCv();
    const filePath = path.join(CV_DIR, storedAs);
    expect(fs.existsSync(filePath)).toBe(true);

    const res = await request(app)
      .post('/api/applications/data-delete')
      .send({ refNumber, email, confirm: 'DELETE' });

    expect(res.status).toBe(200);
    expect(fs.existsSync(filePath)).toBe(false);
    const stillThere = await Application.findOne({ refNumber });
    expect(stillThere).toBeNull();
  });

  it('succeeds and logs warning when file already missing on disk', async () => {
    const { refNumber, storedAs, email } = await makeApplicationWithCv();
    await fsp.unlink(path.join(CV_DIR, storedAs));

    const res = await request(app)
      .post('/api/applications/data-delete')
      .send({ refNumber, email, confirm: 'DELETE' });

    expect(res.status).toBe(200);
    const stillThere = await Application.findOne({ refNumber });
    expect(stillThere).toBeNull();
  });
});
