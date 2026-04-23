import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import Admin from '../src/models/Admin.js';
import PageView from '../src/models/PageView.js';
import TrackingEvent from '../src/models/TrackingEvent.js';

const app = createApp();
let authCookie;
let csrfToken;

beforeAll(async () => {
  // Create admin and login for protected traffic endpoints
  const hashed = await bcrypt.hash('AdminPass123!', 10);
  await Admin.create({ email: 'traffic-admin@bemore.co.za', password: hashed });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'traffic-admin@bemore.co.za', password: 'AdminPass123!' });

  const cookies = loginRes.headers['set-cookie'] || [];
  authCookie = cookies.find(c => c.startsWith('bm_token=')) || '';
  csrfToken = loginRes.body.data?.csrfToken || '';
});

afterEach(async () => {
  await PageView.deleteMany({});
  await TrackingEvent.deleteMany({});
});

describe('Public Tracking Endpoints', () => {
  describe('POST /api/track/pageview', () => {
    it('should accept valid pageview data', async () => {
      const res = await request(app)
        .post('/api/track/pageview')
        .send({
          sessionId: 'sess_123',
          visitorId: 'vis_456',
          path: '/test-page'
        });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 for missing sessionId', async () => {
      const res = await request(app)
        .post('/api/track/pageview')
        .send({ visitorId: 'vis_456', path: '/test' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid path length', async () => {
      const res = await request(app)
        .post('/api/track/pageview')
        .send({
          sessionId: 'sess_123',
          visitorId: 'vis_456',
          path: 'a'.repeat(600) // exceeds 500 char limit
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/track/event', () => {
    it('should accept valid event data', async () => {
      const res = await request(app)
        .post('/api/track/event')
        .send({
          sessionId: 'sess_123',
          visitorId: 'vis_456',
          category: 'click',
          action: 'cta_click'
        });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 for invalid category', async () => {
      const res = await request(app)
        .post('/api/track/event')
        .send({
          sessionId: 'sess_123',
          visitorId: 'vis_456',
          category: 'invalid',
          action: 'test'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/track/heartbeat', () => {
    it('should accept valid heartbeat data', async () => {
      const res = await request(app)
        .post('/api/track/heartbeat')
        .send({
          sessionId: 'sess_123',
          path: '/test',
          duration: 5000
        });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 for non-numeric duration', async () => {
      const res = await request(app)
        .post('/api/track/heartbeat')
        .send({
          sessionId: 'sess_123',
          path: '/test',
          duration: 'not-a-number'
        });

      expect(res.status).toBe(400);
    });
  });
});

describe('Admin Traffic Insights (GET /api/insights/traffic)', () => {
  it('should return traffic data for authenticated admin', async () => {
    const res = await request(app)
      .get('/api/insights/traffic')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(expect.any(Object));
  });

  it('should return 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/insights/traffic');
    expect(res.status).toBe(401);
  });
});
