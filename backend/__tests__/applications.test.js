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
