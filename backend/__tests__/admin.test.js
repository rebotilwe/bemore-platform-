import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import Admin from '../src/models/Admin.js';
import AdminAuditLog from '../src/models/AdminAuditLog.js';

const app = createApp();
let authCookie;
let csrfToken;
let testAdminId;

beforeAll(async () => {
  const hashed = await bcrypt.hash('AdminPass123!', 10);
  const admin = await Admin.create({
    email: 'admin@bemore.co.za',
    password: hashed,
    name: 'Test Admin'
  });
  testAdminId = admin._id.toString();

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@bemore.co.za', password: 'AdminPass123!' });

  const cookies = loginRes.headers['set-cookie'] || [];
  authCookie = cookies.find(c => c.startsWith('bm_token=')) || '';
  csrfToken = loginRes.body.data?.csrfToken || '';
});

afterEach(async () => {
  await Admin.deleteMany({ _id: { $ne: testAdminId } });
  await AdminAuditLog.deleteMany({});
});

describe('GET /api/admins', () => {
  it('should return 200 with admin list for authenticated admin', async () => {
    const res = await request(app)
      .get('/api/admins')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(expect.any(Array));
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should return 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/admins');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/admins', () => {
  it('should create admin with valid data', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'newadmin@bemore.co.za', password: 'NewPass123!', name: 'New Admin' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('newadmin@bemore.co.za');
  });

  it('should return 409 for duplicate email', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'admin@bemore.co.za', password: 'Pass123!', name: 'Duplicate' });

    expect(res.status).toBe(409);
  });

  it('should return 401 for unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/admins')
      .send({ email: 'unauth@bemore.co.za', password: 'Pass123!' });

    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/admins/:id', () => {
  it('should update admin email', async () => {
    const res = await request(app)
      .patch(`/api/admins/${testAdminId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'updated@bemore.co.za' });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('updated@bemore.co.za');
  });

  it('should return 404 for non-existent admin', async () => {
    const res = await request(app)
      .patch('/api/admins/000000000000000000000000')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Test' });

    expect(res.status).toBe(404);
  });

  it('should return 409 for duplicate email on update', async () => {
    const hashed = await bcrypt.hash('Pass123!', 10);
    const otherAdmin = await Admin.create({ email: 'other@bemore.co.za', password: hashed });

    const res = await request(app)
      .patch(`/api/admins/${testAdminId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'other@bemore.co.za' });

    expect(res.status).toBe(409);
    await Admin.deleteOne({ _id: otherAdmin._id });
  });
});

describe('DELETE /api/admins/:id', () => {
  it('should delete another admin', async () => {
    const hashed = await bcrypt.hash('Pass123!', 10);
    const otherAdmin = await Admin.create({ email: 'todelete@bemore.co.za', password: hashed });

    const res = await request(app)
      .delete(`/api/admins/${otherAdmin._id}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 for self-deletion', async () => {
    const res = await request(app)
      .delete(`/api/admins/${testAdminId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(400);
  });

  it('should return 400 when deleting last admin', async () => {
    await Admin.deleteMany({ _id: { $ne: testAdminId } });
    const res = await request(app)
      .delete(`/api/admins/${testAdminId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(400);
  });
});
