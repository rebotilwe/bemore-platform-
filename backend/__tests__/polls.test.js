import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import Poll from '../src/models/Poll.js';
import PollResponse from '../src/models/PollResponse.js';
import Admin from '../src/models/Admin.js';

const app = createApp();
let authCookie;
let csrfToken;
let pollId;
let questionId;
let optionId;

async function seedTestData() {
  const hashed = await bcrypt.hash('TestPass123!', 10);
  await Admin.create({ email: 'poll-admin@bemore.co.za', password: hashed });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'poll-admin@bemore.co.za', password: 'TestPass123!' });

  const cookies = loginRes.headers['set-cookie'] || [];
  authCookie = cookies.find(c => c.startsWith('bm_token=')) || '';
  csrfToken = loginRes.body.data?.csrfToken || '';

  // Create a test poll in draft status
  const pollRes = await request(app)
    .post('/api/polls')
    .set('Cookie', authCookie)
    .set('X-CSRF-Token', csrfToken)
    .send({
      title: 'Test Poll',
      description: 'A poll for testing',
      questions: [
        {
          text: 'Favorite color?',
          type: 'multiple-choice',
          options: [
            { text: 'Red', color: '#ff0000' },
            { text: 'Blue', color: '#0000ff' },
          ],
          settings: { maxSelections: 1 },
        },
        {
          text: 'Rate this session',
          type: 'rating',
          settings: { ratingMax: 5 },
        },
      ],
    });

  pollId = pollRes.body.data?._id;
  questionId = pollRes.body.data?.questions[0]._id;
  optionId = pollRes.body.data?.questions[0].options[0]._id;
}

beforeAll(async () => { await seedTestData(); });

afterAll(async () => {
  // Cleanup handled by mongoose connection teardown in Jest setup
});

// ══════════════════════════════════════
// 1. PUBLIC ENDPOINTS (no auth)
// ══════════════════════════════════════

describe('GET /api/polls/active (public)', () => {
  it('should return null when no active poll', async () => {
    const res = await request(app).get('/api/polls/active');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });
});

// ══════════════════════════════════════
// 2. ADMIN: CRUD
// ══════════════════════════════════════

describe('POST /api/polls (admin)', () => {
  it('should create poll with valid data', async () => {
    const res = await request(app)
      .post('/api/polls')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        title: 'Another Poll',
        questions: [{ text: 'Q1?', type: 'multiple-choice', options: [{ text: 'A' }] }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Another Poll');
    expect(res.body.data.questions).toHaveLength(1);
  });

  it('should require auth', async () => {
    const res = await request(app)
      .post('/api/polls')
      .send({ title: 'Fail Poll', questions: [] });
    expect(res.status).toBe(401);
  });

  it('should require title', async () => {
    const res = await request(app)
      .post('/api/polls')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ questions: [{ text: 'Q?', type: 'multiple-choice', options: [{ text: 'A' }] }] });
    expect(res.status).toBe(400);
  });

  it('should require at least one question', async () => {
    const res = await request(app)
      .post('/api/polls')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'No Questions' });
    expect(res.status).toBe(400);
  });

  it('should reject invalid question type', async () => {
    const res = await request(app)
      .post('/api/polls')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        title: 'Bad Type',
        questions: [{ text: 'Q?', type: 'invalid-type' }],
      });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/polls (admin)', () => {
  it('should list polls with auth', async () => {
    const res = await request(app)
      .get('/api/polls')
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should filter by status', async () => {
    const res = await request(app)
      .get('/api/polls?status=draft')
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    res.body.data.forEach(p => expect(p.status).toBe('draft'));
  });

  it('should require auth', async () => {
    const res = await request(app).get('/api/polls');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/polls/:id (admin)', () => {
  it('should return poll by id', async () => {
    const res = await request(app)
      .get(`/api/polls/${pollId}`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(pollId);
    expect(res.body.data.title).toBe('Test Poll');
  });

  it('should return 404 for non-existent poll', async () => {
    const res = await request(app)
      .get('/api/polls/507f1f77bcf86cd799439011')
      .set('Cookie', authCookie);
    expect(res.status).toBe(404);
  });

  it('should require auth', async () => {
    const res = await request(app).get(`/api/polls/${pollId}`);
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/polls/:id (admin)', () => {
  it('should update poll title', async () => {
    const res = await request(app)
      .patch(`/api/polls/${pollId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Updated Poll Title' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Updated Poll Title');
  });

  it('should not update non-draft poll status via PATCH', async () => {
    // First, set to active (via status endpoint)
    await request(app)
      .patch(`/api/polls/${pollId}/status`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'active' });

    // Try to edit (should fail - not in draft)
    const res = await request(app)
      .patch(`/api/polls/${pollId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Should Fail' });
    expect(res.status).toBe(400);
  });

  it('should require auth', async () => {
    const res = await request(app)
      .patch(`/api/polls/${pollId}`)
      .send({ title: 'No Auth' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/polls/:id/status (admin)', () => {
  it('should update poll status', async () => {
    // First, set back to draft
    await Poll.findByIdAndUpdate(pollId, { status: 'draft' });

    const res = await request(app)
      .patch(`/api/polls/${pollId}/status`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
  });

  it('should deactivate other active polls when activating', async () => {
    // Create another poll and activate it
    const pollRes = await request(app)
      .post('/api/polls')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        title: 'Second Poll',
        questions: [{ text: 'Q1?', type: 'multiple-choice', options: [{ text: 'A' }] }],
      });

    const newPollId = pollRes.body.data._id;
    await request(app)
      .patch(`/api/polls/${newPollId}/status`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'active' });

    // First poll should now be paused
    const firstPoll = await Poll.findById(pollId);
    expect(['paused', 'draft']).toContain(firstPoll.status);
  });

  it('should reject invalid status', async () => {
    const res = await request(app)
      .patch(`/api/polls/${pollId}/status`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'invalid-status' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/polls/:id/activate (admin)', () => {
  it('should activate a question', async () => {
    // Set poll to active first
    await Poll.findByIdAndUpdate(pollId, { status: 'active' });

    const res = await request(app)
      .patch(`/api/polls/${pollId}/activate`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ questionIndex: 0 });
    expect(res.status).toBe(200);
    expect(res.body.data.activeQuestionIndex).toBe(0);
  });

  it('should reject invalid question index', async () => {
    const res = await request(app)
      .patch(`/api/polls/${pollId}/activate`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ questionIndex: 99 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/polls/:id/results (admin)', () => {
  it('should return results for poll', async () => {
    const res = await request(app)
      .get(`/api/polls/${pollId}/results`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('poll');
    expect(res.body.data).toHaveProperty('results');
    expect(Array.isArray(res.body.data.results)).toBe(true);
  });

  it('should require auth', async () => {
    const res = await request(app).get(`/api/polls/${pollId}/results`);
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/polls/:id (admin)', () => {
  let deletePollId;

  beforeAll(async () => {
    const pollRes = await request(app)
      .post('/api/polls')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        title: 'Delete Me',
        questions: [{ text: 'Q?', type: 'open-text' }],
      });
    deletePollId = pollRes.body.data._id;
  });

  it('should delete poll and responses', async () => {
    const res = await request(app)
      .delete(`/api/polls/${deletePollId}`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(200);

    // Verify deleted
    const found = await Poll.findById(deletePollId);
    expect(found).toBeNull();
  });

  it('should return 404 for non-existent poll', async () => {
    const res = await request(app)
      .delete('/api/polls/507f1f77bcf86cd799439011')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(404);
  });

  it('should require auth', async () => {
    const res = await request(app).delete(`/api/polls/${pollId}`);
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════
// 3. VOTING (public)
// ══════════════════════════════════════

describe('POST /api/polls/:id/vote (multiple-choice)', () => {
  let activePollId;
  let activeQuestionId;
  let activeOptionId;

  beforeAll(async () => {
    // Create and activate a poll for voting
    const pollRes = await request(app)
      .post('/api/polls')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        title: 'Voting Test Poll',
        questions: [
          {
            text: 'Choose one:',
            type: 'multiple-choice',
            options: [
              { text: 'Option A', color: '#aaa' },
              { text: 'Option B', color: '#bbb' },
            ],
          },
        ],
      });

    activePollId = pollRes.body.data._id;
    activeQuestionId = pollRes.body.data.questions[0]._id;
    activeOptionId = pollRes.body.data.questions[0].options[0]._id;

    // Activate the poll and question
    await request(app)
      .patch(`/api/polls/${activePollId}/status`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'active' });

    await request(app)
      .patch(`/api/polls/${activePollId}/activate`)
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ questionIndex: 0 });
  });

  it('should cast vote successfully', async () => {
    const res = await request(app)
      .post(`/api/polls/${activePollId}/vote`)
      .send({
        questionId: activeQuestionId,
        optionId: activeOptionId,
        sessionId: 'voter-session-1',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should prevent duplicate voting', async () => {
    // Try to vote again with same sessionId
    const res = await request(app)
      .post(`/api/polls/${activePollId}/vote`)
      .send({
        questionId: activeQuestionId,
        optionId: activeOptionId,
        sessionId: 'voter-session-1', // Same session
      });
    expect(res.status).toBe(409);
  });

  it('should require questionId', async () => {
    const res = await request(app)
      .post(`/api/polls/${activePollId}/vote`)
      .send({
        optionId: activeOptionId,
        sessionId: 'voter-session-2',
      });
    expect(res.status).toBe(400);
  });

  it('should require sessionId', async () => {
    const res = await request(app)
      .post(`/api/polls/${activePollId}/vote`)
      .send({
        questionId: activeQuestionId,
        optionId: activeOptionId,
      });
    expect(res.status).toBe(400);
  });

  it('should reject invalid optionId', async () => {
    const res = await request(app)
      .post(`/api/polls/${activePollId}/vote`)
      .send({
        questionId: activeQuestionId,
        optionId: '507f1f77bcf86cd799439012',
        sessionId: 'voter-session-3',
      });
    expect(res.status).toBe(400);
  });
});
