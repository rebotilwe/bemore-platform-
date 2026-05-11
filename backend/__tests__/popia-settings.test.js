import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import Application from '../src/models/Application.js';
import Admin from '../src/models/Admin.js';
import SiteSettings from '../src/models/SiteSettings.js';
import EmailLog from '../src/models/EmailLog.js';

const app = createApp();
let authCookie;
let csrfToken;
let testRefNumber;

async function seedTestData() {
  const hashed = await bcrypt.hash('TestPass123!', 10);
  await Admin.create({ email: 'popia-admin@bemore.co.za', password: hashed });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'popia-admin@bemore.co.za', password: 'TestPass123!' });

  const cookies = loginRes.headers['set-cookie'] || [];
  authCookie = cookies.find(c => c.startsWith('bm_token=')) || '';
  csrfToken = loginRes.body.data?.csrfToken || '';

  const appRes = await request(app)
    .post('/api/applications')
    .send({
      userType: 'developer',
      personal: { firstName: 'Popia', surname: 'Test', email: 'popia@example.co.za', phone: '+27821234567' },
      formData: { landStatus: 'Land Secured', projectStage: 'Funding Stage', estimatedValue: 'R20m – R100m' },
      consent: { tc: true, popia: true },
    });
  testRefNumber = appRes.body.data.refNumber;
}

beforeAll(async () => { await seedTestData(); });

// ═══════════════════════════════════════════
//  DUPLICATE PREVENTION
// ═══════════════════════════════════════════

describe('Duplicate Application Prevention', () => {
  it('should return 409 when same email + userType already exists', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({
        userType: 'developer',
        personal: { firstName: 'Duplicate', surname: 'User', email: 'popia@example.co.za', phone: '+27829999999' },
        formData: {},
        consent: { tc: true, popia: true },
      });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists');
  });

  it('should allow same email with different userType', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({
        userType: 'landowner',
        personal: { firstName: 'Popia', surname: 'Test', email: 'popia@example.co.za', phone: '+27821234567' },
        formData: {},
        consent: { tc: true, popia: true },
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════
//  POPIA DATA EXPORT
// ═══════════════════════════════════════════

describe('POST /api/applications/data-export', () => {
  it('should export data for valid refNumber + email', async () => {
    const res = await request(app)
      .post('/api/applications/data-export')
      .send({ refNumber: testRefNumber, email: 'popia@example.co.za' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.refNumber).toBe(testRefNumber);
    expect(res.body.data.personal.firstName).toBe('Popia');
  });

  it('should return 404 for wrong email', async () => {
    const res = await request(app)
      .post('/api/applications/data-export')
      .send({ refNumber: testRefNumber, email: 'wrong@example.co.za' });
    expect(res.status).toBe(404);
  });

  it('should return 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/applications/data-export')
      .send({ refNumber: testRefNumber });
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════
//  POPIA DATA DELETE
// ═══════════════════════════════════════════

describe('POST /api/applications/data-delete', () => {
  let deleteRefNumber;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({
        userType: 'investor',
        personal: { firstName: 'Delete', surname: 'Me', email: 'deleteme@example.co.za', phone: '+27831111111' },
        formData: {},
        consent: { tc: true, popia: true },
      });
    deleteRefNumber = res.body.data.refNumber;
  });

  it('should reject without confirm field', async () => {
    const res = await request(app)
      .post('/api/applications/data-delete')
      .send({ refNumber: deleteRefNumber, email: 'deleteme@example.co.za' });
    expect(res.status).toBe(400);
  });

  it('should reject with wrong confirm value', async () => {
    const res = await request(app)
      .post('/api/applications/data-delete')
      .send({ refNumber: deleteRefNumber, email: 'deleteme@example.co.za', confirm: 'YES' });
    expect(res.status).toBe(400);
  });

  it('should permanently delete data with correct confirm', async () => {
    const res = await request(app)
      .post('/api/applications/data-delete')
      .send({ refNumber: deleteRefNumber, email: 'deleteme@example.co.za', confirm: 'DELETE' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify actually deleted
    const check = await Application.findOne({ refNumber: deleteRefNumber });
    expect(check).toBeNull();
  });

  it('should return 404 when deleting already-deleted data', async () => {
    const res = await request(app)
      .post('/api/applications/data-delete')
      .send({ refNumber: deleteRefNumber, email: 'deleteme@example.co.za', confirm: 'DELETE' });
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════
//  SITE SETTINGS
// ═══════════════════════════════════════════

describe('Site Settings API', () => {
  it('PUT should require auth', async () => {
    const res = await request(app)
      .put('/api/settings/registrationOpen')
      .send({ value: true });
    expect(res.status).toBe(401);
  });

  it('PUT should update a setting with auth', async () => {
    const res = await request(app)
      .put('/api/settings/registrationOpen')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ value: false });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /public/:key should return the setting without auth', async () => {
    const res = await request(app)
      .get('/api/settings/public/registrationOpen');
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe(false);
  });

  it('GET /public/:key should return 404 for non-whitelisted key', async () => {
    const res = await request(app)
      .get('/api/settings/public/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET / should return all settings with auth', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('registrationOpen');
  });
});

// ═══════════════════════════════════════════
//  EMAIL LOGS
// ═══════════════════════════════════════════

describe('GET /api/emails/:refNumber', () => {
  beforeAll(async () => {
    await EmailLog.create([
      { to: 'test@example.co.za', subject: 'Test 1', template: 'submission_confirmation', refNumber: testRefNumber, status: 'sent' },
      { to: 'test@example.co.za', subject: 'Test 2', template: 'status_notification', refNumber: testRefNumber, status: 'failed', error: 'Resend timeout' },
    ]);
  });

  it('should require auth', async () => {
    const res = await request(app).get(`/api/emails/${testRefNumber}`);
    expect(res.status).toBe(401);
  });

  it('should return email logs for a refNumber', async () => {
    const res = await request(app)
      .get(`/api/emails/${testRefNumber}`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0]).toHaveProperty('template');
    expect(res.body.data[0]).toHaveProperty('status');
  });
});
