import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import Application from '../src/models/Application.js';
import Admin from '../src/models/Admin.js';
import {
  validApplication,
  validLandowner,
  invalidApplication,
  duplicateEmailApplication,
} from './fixtures/applications.js';

const app = createApp();

async function createTestAdmin() {
  const hashedPassword = await bcrypt.hash('BeMore@2026!', 10);
  return Admin.create({
    email: 'admin@bemore.co.za',
    password: hashedPassword,
  });
}

async function getAuthCookies() {
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@bemore.co.za', password: 'BeMore@2026!' });

  const cookies = loginResponse.headers['set-cookie'] || [];
  const authCookie = cookies.find(c => c.startsWith('bm_token=')) || '';
  const csrfCookie = cookies.find(c => c.startsWith('bm_csrf=')) || '';
  const csrfToken = loginResponse.body.data?.csrfToken;

  return { authCookie, csrfCookie, csrfToken };
}

afterEach(async () => {
  await Application.deleteMany({});
  await Admin.deleteMany({});
});

describe('POST /api/applications', () => {
  it('should create application with valid data', async () => {
    const response = await request(app)
      .post('/api/applications')
      .send(validApplication);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('refNumber');
  });

  it('should auto-generate refNumber', async () => {
    const response = await request(app)
      .post('/api/applications')
      .send(validApplication);

    expect(response.body.data.refNumber).toMatch(/^BM-[A-Z0-9]{8}$/);
  });

  it('should return 400 with invalid data', async () => {
    const response = await request(app)
      .post('/api/applications')
      .send(invalidApplication);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.message || response.body.errors).toBeDefined();
  });

  it('should return 400 for invalid userType', async () => {
    const response = await request(app)
      .post('/api/applications')
      .send({
        ...validApplication,
        userType: 'invalid-type',
      });

    expect(response.status).toBe(400);
  });

  it('should apply auto-tagging', async () => {
    const response = await request(app)
      .post('/api/applications')
      .send(validApplication);

    expect(response.body.data.refNumber).toBeDefined();
  });

  // POPIA — consent (tc + popia) must be persisted on the Application
  // document and rejected when missing or false. The frontend gates the
  // submit button but server-side enforcement is the load-bearing check.
  it('should persist consent.tc + consent.popia + capturedAt on submission', async () => {
    const before = Date.now();
    const response = await request(app)
      .post('/api/applications')
      .send(validApplication);

    expect(response.status).toBe(201);
    const saved = await Application.findOne({ refNumber: response.body.data.refNumber });
    expect(saved.consent.tc).toBe(true);
    expect(saved.consent.popia).toBe(true);
    expect(saved.consent.capturedAt).toBeInstanceOf(Date);
    expect(saved.consent.capturedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('should reject submission missing consent', async () => {
    // Strip the consent block — should 400.
    const { consent: _omit, ...withoutConsent } = validApplication;
    void _omit;
    const response = await request(app)
      .post('/api/applications')
      .send({ ...withoutConsent, personal: { ...withoutConsent.personal, email: 'no-consent@example.com' } });

    expect(response.status).toBe(400);
  });

  it('should reject submission with consent.tc=false', async () => {
    const response = await request(app)
      .post('/api/applications')
      .send({
        ...validApplication,
        personal: { ...validApplication.personal, email: 'declined-tc@example.com' },
        consent: { tc: false, popia: true },
      });

    expect(response.status).toBe(400);
  });

  // Regression test for QA blocker #1 — Professional Q15 "Other" branch.
  // The route-level formData whitelist must permit `notActiveReasonOther`
  // (free-text reason) alongside `notActiveReason='Other'`. Before the fix,
  // the field was silently stripped → data loss.
  it('should persist Professional notActiveReasonOther when Q15 is "Other"', async () => {
    const response = await request(app)
      .post('/api/applications')
      .send({
        userType: 'professional',
        personal: {
          firstName: 'Lerato',
          surname: 'Mokoena',
          email: 'lerato.q15@example.co.za',
          phone: '+27821234567',
        },
        formData: {
          primaryRole: 'Architect',
          experienceLevel: 'Senior (10+ years)',
          provinces: ['Gauteng'],
          workStructure: 'Independent',
          projectTypes: ['Residential'],
          avgProjectSize: 'Mid-scale (R5M–R20M)',
          workStyle: 'Project-based contracts',
          proWhatMatters: ['Project scale'],
          activityLevel: 'Not actively looking',
          notActiveReason: 'Other',
          notActiveReasonOther: 'Sabbatical year',
        },
        consent: { tc: true, popia: true },
        engagementSource: 'direct',
      });
    // (test continues below)

    expect(response.status).toBe(201);
    const saved = await Application.findOne({ refNumber: response.body.data.refNumber });
    expect(saved.formData.notActiveReason).toBe('Other');
    expect(saved.formData.notActiveReasonOther).toBe('Sabbatical year');
  });

  it('should create landowner application', async () => {
    const response = await request(app)
      .post('/api/applications')
      .send(validLandowner);

    expect(response.status).toBe(201);
    expect(response.body.data.refNumber).toBeDefined();
  });
});

describe('GET /api/applications (admin)', () => {
  let authCookie;
  let csrfToken;

  beforeEach(async () => {
    await createTestAdmin();
    const cookies = await getAuthCookies();
    authCookie = cookies.authCookie;
    csrfToken = cookies.csrfToken;
  });

  it('should require authentication', async () => {
    const response = await request(app).get('/api/applications');

    expect(response.status).toBe(401);
  });

  it('should return list of applications with valid token', async () => {
    await request(app).post('/api/applications').send(validApplication);

    const response = await request(app)
      .get('/api/applications')
      .set('Cookie', authCookie);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should support pagination', async () => {
    await request(app).post('/api/applications').send(validApplication);

    const response = await request(app)
      .get('/api/applications?page=1&limit=10')
      .set('Cookie', authCookie);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('pagination');
  });

  it('should filter by userType', async () => {
    await request(app).post('/api/applications').send(validApplication);
    await request(app).post('/api/applications').send(validLandowner);

    const response = await request(app)
      .get('/api/applications?userType=developer')
      .set('Cookie', authCookie);

    expect(response.status).toBe(200);
    response.body.data.forEach((app) => {
      expect(app.userType).toBe('developer');
    });
  });

  it('should filter by status', async () => {
    await request(app).post('/api/applications').send(validApplication);

    const response = await request(app)
      .get('/api/applications?status=new')
      .set('Cookie', authCookie);

    expect(response.status).toBe(200);
    response.body.data.forEach((app) => {
      expect(app.status).toBe('new');
    });
  });
});

describe('GET /api/applications/stats (admin)', () => {
  let authCookie;
  let csrfToken;

  beforeEach(async () => {
    await createTestAdmin();
    const cookies = await getAuthCookies();
    authCookie = cookies.authCookie;
    csrfToken = cookies.csrfToken;
  });

  it('should return application statistics', async () => {
    await request(app).post('/api/applications').send(validApplication);

    const response = await request(app)
      .get('/api/applications/stats')
      .set('Cookie', authCookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.total).toBeGreaterThanOrEqual(1);
  });

  it('should return count by status', async () => {
    await request(app).post('/api/applications').send(validApplication);

    const response = await request(app)
      .get('/api/applications/stats')
      .set('Cookie', authCookie);

    expect(response.body.data.byStatus).toBeDefined();
    expect(response.body.data.byStatus.find(s => s._id === 'new')?.count).toBeGreaterThanOrEqual(1);
  });

  it('should return count by userType', async () => {
    await request(app).post('/api/applications').send(validApplication);

    const response = await request(app)
      .get('/api/applications/stats')
      .set('Cookie', authCookie);

    expect(response.body.data.byType).toBeDefined();
    expect(response.body.data.byType.find(t => t._id === 'developer')?.count).toBeGreaterThanOrEqual(1);
  });
});

describe('PATCH /api/applications/:id (admin)', () => {
  let authCookie;
  let csrfToken;
  let applicationId;

  beforeEach(async () => {
    await createTestAdmin();
    const cookies = await getAuthCookies();
    authCookie = cookies.authCookie;
    csrfToken = cookies.csrfToken;

    const appResponse = await request(app)
      .post('/api/applications')
      .send(validApplication);

    // POST only returns refNumber — look up the full doc for the ID
    const ref = appResponse.body.data.refNumber;
    const doc = await Application.findOne({ refNumber: ref });
    applicationId = doc._id.toString();
  });

  it('should update application status', async () => {
    const response = await request(app)
      .patch(`/api/applications/${applicationId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'reviewing' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('reviewing');
  });

  it('should add admin notes', async () => {
    const response = await request(app)
      .patch(`/api/applications/${applicationId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ adminNotes: 'Looking promising' });

    expect(response.status).toBe(200);
    expect(response.body.data.adminNotes).toBe('Looking promising');
  });

  it('should update dealRoom settings', async () => {
    const response = await request(app)
      .patch(`/api/applications/${applicationId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        dealRoom: {
          summitAccess: true,
          dealRoomEntry: true,
          funders: ['PBSA'],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.data.dealRoom.summitAccess).toBe(true);
    expect(response.body.data.dealRoom.funders).toContain('PBSA');
  });

  it('should return 400 for invalid status', async () => {
    const response = await request(app)
      .patch(`/api/applications/${applicationId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'invalid-status' });

    expect(response.status).toBe(400);
  });

  it('should return 404 for non-existent application', async () => {
    const response = await request(app)
      .patch('/api/applications/507f1f77bcf86cd799439011')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'reviewing' });

    expect(response.status).toBe(404);
  });
});

describe('POST /api/applications — attachments[] (spec §8.2)', () => {
  // Use the CV_DIR that the uploadService computed at import time.
  // For these tests we just write directly to whatever CV_DIR resolved to.
  let CV_DIR;
  beforeAll(async () => {
    const fs = (await import('node:fs')).default;
    const svc = await import('../src/services/uploadService.js');
    CV_DIR = svc.CV_DIR;
    try {
      fs.mkdirSync(CV_DIR, { recursive: true, mode: 0o755 });
    } catch (err) {
      // If we can't write to /app/uploads/cv (e.g. local dev without volume),
      // skip these tests with a clear message.
      // eslint-disable-next-line no-console
      console.warn(`Cannot create ${CV_DIR}: ${err.message}. Set UPLOAD_DIR env var.`);
    }
  });

  async function writeFakeCv(name, body = '%PDF-1.4\nfake\n') {
    const path = (await import('node:path')).default;
    const fsp = (await import('node:fs/promises')).default;
    const target = path.join(CV_DIR, name);
    await fsp.writeFile(target, body);
    return name;
  }

  it('persists attachments[] when storedAs exists on disk', async () => {
    const stored = await writeFakeCv('aa11aa11-aa11-4a11-aa11-aa11aa11aa11.pdf');
    const res = await request(app)
      .post('/api/applications')
      .send({
        ...validApplication,
        personal: { ...validApplication.personal, email: 'pro1@example.com' },
        userType: 'professional',
        attachments: [{ field: 'cv', storedAs: stored, filename: 'alex-cv.pdf' }],
      });
    expect(res.status).toBe(201);
    const saved = await Application.findOne({ refNumber: res.body.data.refNumber });
    expect(saved.attachments).toHaveLength(1);
    expect(saved.attachments[0].field).toBe('cv');
    expect(saved.attachments[0].storedAs).toBe(stored);
    expect(saved.attachments[0].filename).toBe('alex-cv.pdf');
    expect(saved.attachments[0].mimeType).toBe('application/pdf');
    expect(saved.attachments[0].size).toBeGreaterThan(0);
  });

  it('returns 400 ATTACHMENT_NOT_FOUND when storedAs is missing on disk', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({
        ...validApplication,
        personal: { ...validApplication.personal, email: 'pro2@example.com' },
        userType: 'professional',
        attachments: [{ field: 'cv', storedAs: 'missing-file.pdf' }],
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ATTACHMENT_NOT_FOUND');
  });

  it('returns 400 ATTACHMENT_FIELD_INVALID for unknown field', async () => {
    const stored = await writeFakeCv('bb22bb22-bb22-4b22-bb22-bb22bb22bb22.pdf');
    const res = await request(app)
      .post('/api/applications')
      .send({
        ...validApplication,
        personal: { ...validApplication.personal, email: 'pro3@example.com' },
        userType: 'professional',
        attachments: [{ field: 'passport', storedAs: stored }],
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ATTACHMENT_FIELD_INVALID');
  });

  it('submitting without attachments still works (no regression)', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({ ...validApplication, personal: { ...validApplication.personal, email: 'plain@example.com' } });
    expect(res.status).toBe(201);
    const saved = await Application.findOne({ refNumber: res.body.data.refNumber });
    expect(saved.attachments).toEqual([]);
  });
});

describe('Rate Limiting', () => {
  let authCookie;
  let csrfToken;

  beforeEach(async () => {
    await createTestAdmin();
    const cookies = await getAuthCookies();
    authCookie = cookies.authCookie;
    csrfToken = cookies.csrfToken;
  });

  it('should allow requests within rate limit', async () => {
    const response = await request(app)
      .get('/api/applications')
      .set('Cookie', authCookie);

    expect(response.status).toBe(200);
  });
});
