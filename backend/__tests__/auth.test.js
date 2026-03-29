import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { config } from '../src/config/index.js';
import Admin from '../src/models/Admin.js';

const app = createApp();

afterEach(async () => {
  await Admin.deleteMany({});
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('BeMore@2026!', 10);
    await Admin.create({
      email: 'admin@bemore.co.za',
      password: hashedPassword,
    });
  });

  it('should return 200 and token on valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@bemore.co.za', password: 'BeMore@2026!' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data).toHaveProperty('expiresIn');
  });

  it('should return 401 on invalid password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@bemore.co.za', password: 'wrongpassword' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.message).toContain('Invalid');
  });

  it('should return 400 on missing email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ password: 'BeMore@2026!' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
  });

  it('should return 400 on invalid email format', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
  });

  it('should return 401 on non-existent user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'password123' });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Invalid');
  });
});

describe('GET /api/auth/verify', () => {
  let authToken;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('BeMore@2026!', 10);
    await Admin.create({
      email: 'admin@bemore.co.za',
      password: hashedPassword,
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@bemore.co.za', password: 'BeMore@2026!' });
    
    authToken = loginResponse.body.data?.token;
  });

  it('should return 200 with admin data on valid token', async () => {
    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });

  it('should return 401 on missing token', async () => {
    const response = await request(app).get('/api/auth/verify');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('No token');
  });

  it('should return 401 on invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Invalid');
  });
});
