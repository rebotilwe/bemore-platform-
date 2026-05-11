import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import Admin from '../src/models/Admin.js';
import Application from '../src/models/Application.js';

const app = createApp();
let authCookie;
let csrfToken;

beforeAll(async () => {
  // Create admin and login
  const hashed = await bcrypt.hash('AdminPass123!', 10);
  await Admin.create({ email: 'report-admin@bemore.co.za', password: hashed });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'report-admin@bemore.co.za', password: 'AdminPass123!' });

  const cookies = loginRes.headers['set-cookie'] || [];
  authCookie = cookies.find(c => c.startsWith('bm_token=')) || '';
  csrfToken = loginRes.body.data?.csrfToken || '';

  // Seed test applications for reports
  await Application.create([
    {
      refNumber: 'BM-TEST001',
      userType: 'developer',
      personal: { firstName: 'High', surname: 'Value', email: 'high@example.com', phone: '0821111111' },
      formData: {},
      tags: ['HIGH_VALUE'],
      status: 'new'
    },
    {
      refNumber: 'BM-TEST002',
      userType: 'landowner',
      personal: { firstName: 'Pipeline', surname: 'Ready', email: 'pipeline@example.com', phone: '0822222222' },
      formData: {},
      tags: ['PIPELINE_READY'],
      status: 'new'
    },
    {
      refNumber: 'BM-TEST003',
      userType: 'developer',
      personal: { firstName: 'Institutional', surname: 'Grade', email: 'institutional@example.com', phone: '0823333333' },
      formData: {},
      tags: ['INSTITUTIONAL_GRADE'],
      status: 'new'
    },
    {
      refNumber: 'BM-TEST004',
      userType: 'developer',
      personal: { firstName: 'Shortlisted', surname: 'App', email: 'shortlisted@example.com', phone: '0824444444' },
      formData: {},
      tags: [],
      status: 'shortlisted'
    }
  ]);
});

// No afterAll needed - test DB is reset globally

describe('GET /api/reports/:name', () => {
  it('should return high-value-developers report', async () => {
    const res = await request(app)
      .get('/api/reports/high-value-developers')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.report).toBe('high-value-developers');
    expect(res.body.data.count).toBeGreaterThan(0);
  });

  it('should return pipeline-ready-developers report', async () => {
    const res = await request(app)
      .get('/api/reports/pipeline-ready-developers')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.data.report).toBe('pipeline-ready-developers');
  });

  it('should return institutional-grade-housing report', async () => {
    const res = await request(app)
      .get('/api/reports/institutional-grade-housing')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.data.report).toBe('institutional-grade-housing');
  });

  it('should return deal-room-shortlist report', async () => {
    const res = await request(app)
      .get('/api/reports/deal-room-shortlist')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.data.report).toBe('deal-room-shortlist');
    expect(res.body.data.count).toBeGreaterThan(0);
  });

  it('should return 400 for invalid report name', async () => {
    const res = await request(app)
      .get('/api/reports/invalid-report')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(400);
  });

  it('should return 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/reports/high-value-developers');
    expect(res.status).toBe(401);
  });
});
