import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import AnalyticsEvent from '../src/models/AnalyticsEvent.js';
import Poll from '../src/models/Poll.js';
import PollResponse from '../src/models/PollResponse.js';
import Admin from '../src/models/Admin.js';

const app = createApp();
let authCookie;
let csrfToken;

async function seedTestData() {
  const hashed = await bcrypt.hash('TestPass123!', 10);
  await Admin.create({ email: 'analytics-admin@bemore.co.za', password: hashed });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'analytics-admin@bemore.co.za', password: 'TestPass123!' });

  const cookies = loginRes.headers['set-cookie'] || [];
  authCookie = cookies.find(c => c.startsWith('bm_token=')) || '';
  csrfToken = loginRes.body.data?.csrfToken || '';

  // Seed some analytics events
  await AnalyticsEvent.create([
    {
      event: 'application.submitted',
      category: 'application',
      ip: '::ffff:127.0.0.1',
      timestamp: new Date(),
    },
    {
      event: 'auth.login',
      category: 'auth',
      actor: { type: 'admin', id: '507f1f77bcf86cd799439011', email: 'test@test.com' },
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      event: 'poll.vote',
      category: 'poll',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ]);
}

beforeAll(async () => { await seedTestData(); });
afterAll(async () => {
  await AnalyticsEvent.deleteMany({});
  await Admin.deleteMany({});
});

// ══════════════════════════════════════
// 1. DASHBOARD
// ══════════════════════════════════════

describe('GET /api/analytics/dashboard (admin)', () => {
  it('should return dashboard data with auth', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalApplications');
    expect(res.body.data).toHaveProperty('applicationsByPeriod');
    expect(res.body.data).toHaveProperty('eventCounts');
    expect(res.body.data).toHaveProperty('topEvents');
  });

  it('should accept valid range parameter', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard?range=7d')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject invalid range', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard?range=invalid')
      .set('Cookie', authCookie);

    expect(res.status).toBe(400);
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/analytics/dashboard');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════
// 2. FUNNEL
// ══════════════════════════════════════

describe('GET /api/analytics/funnel (admin)', () => {
  it('should return funnel data', async () => {
    const res = await request(app)
      .get('/api/analytics/funnel')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('byStatus');
    expect(res.body.data).toHaveProperty('byType');
    expect(res.body.data).toHaveProperty('funnel');
    expect(res.body.data.funnel).toHaveProperty('new');
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/analytics/funnel');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════
// 3. TRENDS
// ══════════════════════════════════════

describe('GET /api/analytics/trends (admin)', () => {
  it('should return trends data', async () => {
    const res = await request(app)
      .get('/api/analytics/trends?granularity=day&range=30d')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('granularity');
    expect(res.body.data).toHaveProperty('data');
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });

  it('should accept valid granularity', async () => {
    const res = await request(app)
      .get('/api/analytics/trends?granularity=week')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.granularity).toBe('week');
  });

  it('should reject invalid granularity', async () => {
    const res = await request(app)
      .get('/api/analytics/trends?granularity=invalid')
      .set('Cookie', authCookie);

    expect(res.status).toBe(400);
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/analytics/trends');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════
// 4. TAGS
// ══════════════════════════════════════

describe('GET /api/analytics/tags (admin)', () => {
  it('should return tag analytics', async () => {
    const res = await request(app)
      .get('/api/analytics/tags')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('tagDistribution');
    expect(res.body.data).toHaveProperty('tagCoOccurrence');
    expect(res.body.data).toHaveProperty('tagsByType');
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/analytics/tags');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════
// 5. DEMOGRAPHICS
// ══════════════════════════════════════

describe('GET /api/analytics/demographics (admin)', () => {
  it('should return demographics data', async () => {
    const res = await request(app)
      .get('/api/analytics/demographics')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('byType');
    expect(res.body.data).toHaveProperty('byValue');
    expect(res.body.data).toHaveProperty('byFundingHistory');
    expect(res.body.data).toHaveProperty('byLandStatus');
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/analytics/demographics');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════
// 6. DEAL ROOM
// ══════════════════════════════════════

describe('GET /api/analytics/deal-room (admin)', () => {
  it('should return deal room analytics', async () => {
    const res = await request(app)
      .get('/api/analytics/deal-room')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('summitAccess');
    expect(res.body.data).toHaveProperty('dealRoomEntry');
    expect(res.body.data).toHaveProperty('funderDistribution');
    expect(res.body.data).toHaveProperty('funderPipeline');
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/analytics/deal-room');
    expect(res.status).toBe(401);
  });
});

// ════════════════════════════════════
// 7. TRAFFIC OVERVIEW
// ══════════════════════════════════════

describe('GET /api/insights/traffic (admin)', () => {
  it('should return traffic overview', async () => {
    const res = await request(app)
      .get('/api/insights/traffic?range=7d')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('pageViews');
    expect(res.body.data).toHaveProperty('uniqueVisitors');
    expect(res.body.data).toHaveProperty('topPages');
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/insights/traffic');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════
// 8. TRAFFIC TRENDS
// ══════════════════════════════════════

describe('GET /api/insights/traffic/trends (admin)', () => {
  it('should return traffic trends', async () => {
    const res = await request(app)
      .get('/api/insights/traffic/trends?granularity=day')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('granularity');
    expect(res.body.data).toHaveProperty('data');
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/insights/traffic/trends');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════
// 9. TRAFFIC REFERRERS
// ══════════════════════════════════════

describe('GET /api/insights/traffic/referrers (admin)', () => {
  it('should return top referrers', async () => {
    const res = await request(app)
      .get('/api/insights/traffic/referrers')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('referrers');
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/insights/traffic/referrers');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════
// 10. TRAFFIC DEVICES
// ══════════════════════════════════════

describe('GET /api/insights/traffic/devices (admin)', () => {
  it('should return device breakdown', async () => {
    const res = await request(app)
      .get('/api/insights/traffic/devices')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('byBrowser');
    expect(res.body.data).toHaveProperty('byDeviceType');
    expect(res.body.data).toHaveProperty('byOS');
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/insights/traffic/devices');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════
// 11. TRAFFIC HOURS
// ══════════════════════════════════════

describe('GET /api/insights/traffic/hours (admin)', () => {
  it('should return hourly heatmap', async () => {
    const res = await request(app)
      .get('/api/insights/traffic/hours')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('data');
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/insights/traffic/hours');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════
// 12. TRAFFIC FORM FUNNEL
// ══════════════════════════════════════

describe('GET /api/insights/traffic/form-funnel (admin)', () => {
  it('should return form funnel data', async () => {
    const res = await request(app)
      .get('/api/insights/traffic/form-funnel')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('steps');
    expect(Array.isArray(res.body.data.steps)).toBe(true);
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/insights/traffic/form-funnel');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════
// 13. TRAFFIC CLICKS
// ══════════════════════════════════════

describe('GET /api/insights/traffic/clicks (admin)', () => {
  it('should return top clicks', async () => {
    const res = await request(app)
      .get('/api/insights/traffic/clicks')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('clicks');
    expect(Array.isArray(res.body.data.clicks)).toBe(true);
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/insights/traffic/clicks');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════
// 14. EVENT LOG (paginated)
// ══════════════════════════════════════

describe('GET /api/insights/events (admin)', () => {
  it('should return paginated event log', async () => {
    const res = await request(app)
      .get('/api/insights/events?page=1&limit=10')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should filter by category', async () => {
    const res = await request(app)
      .get('/api/insights/events?category=application')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should filter by event', async () => {
    const res = await request(app)
      .get('/api/insights/events?event=auth.login')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/insights/events');
    expect(res.status).toBe(401);
  });
});
