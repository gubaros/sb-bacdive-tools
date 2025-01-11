import request from 'supertest';
import { app, server } from '../server.js';

describe('API Tests', () => {
  afterAll(done => {
    server.close(done);
  });

  test('GET /api/stats should return database statistics', async () => {
    const response = await request(app)
      .get('/api/stats')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('totalRecords');
    expect(response.body).toHaveProperty('uniqueGenera');
    expect(response.body).toHaveProperty('uniqueSpecies');
  });

  test('GET /api/bacteria should return paginated results', async () => {
    const response = await request(app)
      .get('/api/bacteria')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });
}); 