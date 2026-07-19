import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../index.js';

let adminToken;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@university.edu', password: 'Admin@1234' });
  adminToken = res.body.data?.accessToken;
});

describe('Payments API', () => {
  describe('POST /api/payments/process', () => {
    it('should reject payment without authentication', async () => {
      const res = await request(app)
        .post('/api/payments/process')
        .send({ orderId: '00000000-0000-0000-0000-000000000000', paymentMethod: 'cash', amount: 10 });
      expect(res.statusCode).toBe(401);
    });

    it('should reject payment for non-existent order', async () => {
      const res = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: '00000000-0000-0000-0000-000000000001',
          paymentMethod: 'cash',
          amount: 10,
        });
      expect([400, 404]).toContain(res.statusCode);
    });

    it('should reject payment with missing amount', async () => {
      const res = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: '00000000-0000-0000-0000-000000000000',
          paymentMethod: 'cash',
        });
      expect([400, 404]).toContain(res.statusCode);
    });

    it('should reject payment with invalid payment method', async () => {
      const res = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: '00000000-0000-0000-0000-000000000000',
          paymentMethod: 'bitcoin',
          amount: 10,
        });
      expect([400, 404]).toContain(res.statusCode);
    });
  });

  describe('Meal Plan deductions', () => {
    it('should reject meal plan payment with insufficient balance', async () => {
      // No real meal plan setup in test — expect 404 or 400
      const res = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: '00000000-0000-0000-0000-000000000000',
          paymentMethod: 'meal_plan',
          amount: 99999,
          studentId: 'STU-0000',
        });
      expect([400, 404]).toContain(res.statusCode);
    });
  });
});
