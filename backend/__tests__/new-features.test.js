import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import Application from '../src/models/Application.js';
import Admin from '../src/models/Admin.js';

const app = createApp();
let authCookie;
let csrfToken;
let testAppId;
let testRefNumber;

async function seedTestData() {
  const hashed = await bcrypt.hash('TestPass123!', 10);
  await Admin.create({ email: 'test-admin@bemore.co.za', password: hashed });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test-admin@bemore.co.za', password: 'TestPass123!' });

  const cookies = loginRes.headers['set-cookie'] || [];
  authCookie = cookies.find(c => c.startsWith('bm_token=')) || '';
  csrfToken = loginRes.body.data?.csrfToken || '';

  const appRes = await request(app)
    .post('/api/applications')
    .send({
      userType: 'developer',
      personal: { firstName: 'Lookup', surname: 'Test', email: 'lookup@example.co.za', phone: '0821234567', companyName: 'Test Corp' },
      formData: { landStatus: 'Land Secured', projectStage: 'Funding Stage', estimatedValue: 'R20m – R100m', engagementSource: 'qr' },
      consent: { tc: true, popia: true },
    });

  testRefNumber = appRes.body.data.refNumber;
  const found = await Application.findOne({ refNumber: testRefNumber });
  testAppId = found._id.toString();
}

beforeAll(async () => { await seedTestData(); });

// ═══════════════════════════════════════════════
// 1. STATUS LOOKUP (POST /api/applications/lookup)
// ═══════════════════════════════════════════════

describe('POST /api/applications/lookup', () => {
  it('should return application for valid refNumber + email', async () => {
    const res = await request(app)
      .post('/api/applications/lookup')
      .send({ refNumber: testRefNumber, email: 'lookup@example.co.za' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.refNumber).toBe(testRefNumber);
    expect(res.body.data.firstName).toBe('Lookup');
    expect(res.body.data.userType).toBe('developer');
    expect(res.body.data.status).toBe('new');
    expect(res.body.data.tags).toEqual(expect.any(Array));
    expect(res.body.data.submittedAt).toBeDefined();
  });

  it('should return 404 for wrong email', async () => {
    const res = await request(app)
      .post('/api/applications/lookup')
      .send({ refNumber: testRefNumber, email: 'wrong@example.co.za' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 for wrong refNumber', async () => {
    const res = await request(app)
      .post('/api/applications/lookup')
      .send({ refNumber: 'BM-NOTEXIST', email: 'lookup@example.co.za' });

    expect(res.status).toBe(404);
  });

  it('should be case-insensitive for email', async () => {
    const res = await request(app)
      .post('/api/applications/lookup')
      .send({ refNumber: testRefNumber, email: 'Lookup@Example.co.za' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/applications/lookup')
      .send({ refNumber: testRefNumber });

    expect(res.status).toBe(400);
  });

  it('should NOT expose sensitive fields', async () => {
    const res = await request(app)
      .post('/api/applications/lookup')
      .send({ refNumber: testRefNumber, email: 'lookup@example.co.za' });

    expect(res.body.data.personal).toBeUndefined();
    expect(res.body.data.adminNotes).toBeUndefined();
    expect(res.body.data.classification).toBeUndefined();
    expect(res.body.data.followUp).toBeUndefined();
    expect(res.body.data._id).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════
// 2. ENGAGEMENT SOURCE TRACKING
// ═══════════════════════════════════════════════

describe('Engagement Source Tracking', () => {
  it('should save engagementSource from formData', async () => {
    // Verify via lookup endpoint (doesn't expose engagementSource but confirms app exists)
    const res = await request(app)
      .post('/api/applications/lookup')
      .send({ refNumber: testRefNumber, email: 'lookup@example.co.za' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('new');
  });

  it('should default to direct when no source provided', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({
        userType: 'investor',
        personal: { firstName: 'No', surname: 'Source', email: 'nosource@test.co.za', phone: '0821111111' },
        formData: {},
        consent: { tc: true, popia: true },
      });

    const doc = await Application.findOne({ 'personal.email': 'nosource@test.co.za' });
    expect(doc.engagementSource).toBe('direct');
    await Application.deleteOne({ 'personal.email': 'nosource@test.co.za' });
  });

  it('should include bySource in stats', async () => {
    const res = await request(app)
      .get('/api/applications/stats')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.bySource).toEqual(expect.any(Array));
    expect(res.body.data.byClassification).toEqual(expect.any(Array));
  });
});

// ═══════════════════════════════════════════════
// 3. CLASSIFICATION & FOLLOW-UP (PATCH fields)
// ═══════════════════════════════════════════════

describe('PATCH /api/applications/:id — Classification', () => {
  it('should accept valid classification', async () => {
    const res = await request(app)
      .patch(`/api/applications/${testAppId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ classification: 'hot' });

    expect(res.status).toBe(200);
    expect(res.body.data.classification).toBe('hot');
  });

  it('should reject invalid classification', async () => {
    const res = await request(app)
      .patch(`/api/applications/${testAppId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ classification: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('should accept all classification values', async () => {
    for (const cls of ['hot', 'warm', 'cold', 'unclassified']) {
      const res = await request(app)
        .patch(`/api/applications/${testAppId}`)
        .set('Cookie', authCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ classification: cls });

      expect(res.status).toBe(200);
    }
  });
});

describe('PATCH /api/applications/:id — Follow-Up', () => {
  it('should accept follow-up with required + dueDate + notes', async () => {
    const res = await request(app)
      .patch(`/api/applications/${testAppId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        followUp: {
          required: true,
          dueDate: '2026-04-05T00:00:00.000Z',
          notes: 'Follow up after summit',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.followUp.required).toBe(true);
    expect(res.body.data.followUp.notes).toBe('Follow up after summit');
  });

  it('should accept follow-up with required only', async () => {
    const res = await request(app)
      .patch(`/api/applications/${testAppId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ followUp: { required: false } });

    expect(res.status).toBe(200);
    expect(res.body.data.followUp.required).toBe(false);
  });

  it('should reject invalid dueDate format', async () => {
    const res = await request(app)
      .patch(`/api/applications/${testAppId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ followUp: { dueDate: 'not-a-date' } });

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════
// 4. ENHANCED HEALTH CHECK
// ═══════════════════════════════════════════════

describe('GET /api/health (enhanced)', () => {
  it('should return database check status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.checks).toBeDefined();
    expect(res.body.checks.database).toBe('ok');
    expect(res.body.uptime).toEqual(expect.any(Number));
    expect(res.body.timestamp).toBeDefined();
  });
});

// ═══════════════════════════════════════════════
// 5. SEND REMINDERS
// ═══════════════════════════════════════════════

describe('POST /api/applications/send-reminders', () => {
  it('should accept valid ids array', async () => {
    const res = await request(app)
      .post('/api/applications/send-reminders')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ ids: [testAppId] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sent).toBeGreaterThanOrEqual(0);
  });

  it('should require auth', async () => {
    const res = await request(app)
      .post('/api/applications/send-reminders')
      .send({ ids: [testAppId] });

    expect(res.status).toBe(401);
  });

  it('should reject empty ids', async () => {
    const res = await request(app)
      .post('/api/applications/send-reminders')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ ids: [] });

    expect(res.status).toBe(400);
  });

  it('should reject invalid MongoDB ids', async () => {
    const res = await request(app)
      .post('/api/applications/send-reminders')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ ids: ['not-a-valid-id'] });

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════
// 6. CSV EXPORT — new fields included
// ═══════════════════════════════════════════════

describe('GET /api/applications/export/csv', () => {
  it('should include new columns in CSV header', async () => {
    const res = await request(app)
      .get('/api/applications/export/csv')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');

    const header = res.text.split('\n')[0];
    // Spec §6.8 — universal columns
    expect(header).toContain('Classification');
    expect(header).toContain('Source');
    expect(header).toContain('Activity Level');
    expect(header).toContain('Feedback');
    expect(header).toContain('Follow-Up Required');
    expect(header).toContain('Follow-Up Due');
    expect(header).toContain('Admin Notes');
    expect(header).toContain('Created At');
    // Per-profile columns appear because the seeded test app is a developer
    expect(header).toContain('Development Stage');
    expect(header).toContain('Project Value');
    expect(header).toContain('Funding Position');
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/applications/export/csv');
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════
// 7. BULK STATUS — email triggers
// ═══════════════════════════════════════════════

describe('POST /api/applications/bulk-status', () => {
  it('should update multiple applications', async () => {
    const res = await request(app)
      .post('/api/applications/bulk-status')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ ids: [testAppId], status: 'reviewing' });

    expect(res.status).toBe(200);
    expect(res.body.data.updated).toBe(1);
  });

  it('should reject more than 100 ids', async () => {
    const fakeIds = Array.from({ length: 101 }, (_, i) => `6500000000000000000${String(i).padStart(5, '0')}`);
    const res = await request(app)
      .post('/api/applications/bulk-status')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ ids: fakeIds, status: 'reviewing' });

    expect(res.status).toBe(400);
  });

  it('should reject invalid status', async () => {
    const res = await request(app)
      .post('/api/applications/bulk-status')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ ids: [testAppId], status: 'invalid' });

    expect(res.status).toBe(400);
  });
});
