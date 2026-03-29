import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('GET /api/health', () => {
  it('should return 200 with success message', async () => {
    const response = await request(app).get('/api/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('BeMore API');
  });

  it('should return JSON content type', async () => {
    const response = await request(app).get('/api/health');
    
    expect(response.headers['content-type']).toContain('application/json');
  });
});
