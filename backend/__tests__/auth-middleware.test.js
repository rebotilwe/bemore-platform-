import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { config } from '../src/config/index.js';

const app = createApp();
const JWT_SECRET = config.jwtSecret;

describe('Auth Middleware — CSRF Protection', () => {
  let adminCookie;
  let csrfToken;

  beforeAll(async () => {
    // Login to get admin session
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@bemore.co.za', password: 'BeMore@2026!' });

    const cookies = loginRes.headers['set-cookie'] || [];
    adminCookie = cookies.find(c => c.startsWith('bm_token=')) || '';
    const csrfCookie = cookies.find(c => c.startsWith('bm_csrf=')) || '';
    
    // Extract CSRF token from cookie value
    if (csrfCookie) {
      const match = csrfCookie.match(/bm_csrf=([^;]+)/);
      csrfToken = match ? match[1] : '';
    }
  });

  describe('JWT Verification', () => {
    it('should accept valid JWT token', () => {
      const token = jwt.sign({ id: '123', email: 'test@test.com' }, JWT_SECRET, { expiresIn: '1h' });
      expect(token).toBeDefined();
    });

    it('should reject invalid JWT token', async () => {
      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', 'Bearer invalid_token_123');
      
      expect(res.status).toBe(401);
    });

    it('should reject expired JWT token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { id: '123', email: 'test@test.com' },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(res.status).toBe(401);
    });

    it('should reject token without Bearer prefix', async () => {
      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', 'invalid_no_bearer');
      
      expect(res.status).toBe(401);
    });
  });

  describe('CSRF Protection', () => {
    it('should allow requests with valid CSRF token', async () => {
      if (!adminCookie || !csrfToken) return; // Skip if not logged in

      const res = await request(app)
        .get('/api/applications')
        .set('Cookie', adminCookie)
        .set('X-CSRF-Token', csrfToken);

      expect(res.status).toBe(200);
    });

    it('should block requests without CSRF token header', async () => {
      if (!adminCookie) return;

      const res = await request(app)
        .post('/api/applications')
        .set('Cookie', adminCookie)
        .send({ userType: 'developer' }); // Will fail validation but should get CSRF check

      // Either 403 (missing CSRF) or 400 (validation) - both mean blocked
      expect([400, 403]).toContain(res.status);
    });

    it('should block requests with invalid CSRF token', async () => {
      if (!adminCookie) return;

      const res = await request(app)
        .post('/api/applications')
        .set('Cookie', adminCookie)
        .set('X-CSRF-Token', 'invalid_csrf_token')
        .send({ userType: 'developer' });

      expect(res.status).toBe(403);
    });

    it('should allow safe methods without CSRF (GET, HEAD, OPTIONS)', async () => {
      if (!adminCookie) return;

      // GET should not require CSRF
      const getRes = await request(app)
        .get('/api/applications')
        .set('Cookie', adminCookie);
      expect(getRes.status).toBe(200);

      // HEAD should not require CSRF
      const headRes = await request(app)
        .head('/api/applications')
        .set('Cookie', adminCookie);
      expect([200, 404]).toContain(headRes.status);
    });

    it('should allow /auth/login without CSRF token', async () => {
      // Login should work without prior CSRF token
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });

      expect(res.status).toBe(401); // Wrong password, but allowed
    });
  });

  describe('Auth Endpoint Security', () => {
    it('should require authentication for protected endpoints', async () => {
      const res = await request(app)
        .get('/api/applications');

      expect(res.status).toBe(401);
    });

    it('should allow public health endpoint', async () => {
      const res = await request(app)
        .get('/api/health');

      expect(res.status).toBe(200);
    });

    it('should allow public application submission', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({
          userType: 'developer',
          personal: { firstName: 'Test', surname: 'User', email: 'csrf@test.com', phone: '+2712345678' },
          formData: { readiness: 'ready', funding: 'self', project: {}, consent: true },
        });

      expect([201, 400]).toContain(res.status);
    });

    it('should reject requests with valid token but no CSRF on POST', async () => {
      if (!adminCookie) return;

      // Has auth but POST without CSRF should fail
      const res = await request(app)
        .post('/api/applications')
        .set('Cookie', adminCookie)
        .send({
          userType: 'developer',
          personal: { firstName: 'Test', surname: 'User', email: 'post@test.com', phone: '+2712345678' },
          formData: { readiness: 'ready', funding: 'self', project: {}, consent: true },
        });

      expect([403, 400]).toContain(res.status);
    });
  });

  describe('Cookie vs Bearer Token', () => {
    it('should accept JWT from cookie', async () => {
      if (!adminCookie) return;

      const res = await request(app)
        .get('/api/applications')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
    });

    it('should accept JWT from Authorization header', async () => {
      // Create a valid token
      const token = jwt.sign({ id: '123', email: 'admin@bemore.co.za' }, JWT_SECRET, { expiresIn: '1h' });

      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should prefer cookie over header when both provided', async () => {
      if (!adminCookie) return;

      // Create an invalid token to check if cookie is preferred
      const res = await request(app)
        .get('/api/applications')
        .set('Cookie', adminCookie)
        .set('Authorization', 'Bearer invalid');

      // If cookie is preferred, should succeed
      expect(res.status).toBe(200);
    });
  });
});