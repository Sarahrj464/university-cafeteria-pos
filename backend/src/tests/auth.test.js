import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../index.js';

// Use a test-specific user that should exist in the seeded DB
const TEST_USER = {
  email: 'admin@university.edu',
  password: 'Admin@1234',
};

describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user).toHaveProperty('role');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: 'WrongPassword123!' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: TEST_USER.password });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject login with missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'Test@1234!' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'Test@1234!' });

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should reject requests without a token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
    });

    it('should return user profile with valid token', async () => {
      // First login to get a token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user).toHaveProperty('email', TEST_USER.email);
    });
  });
});
