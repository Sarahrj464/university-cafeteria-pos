import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../index.js';

let cashierToken;
let kitchenToken;
let adminToken;
let createdOrderId;

beforeAll(async () => {
  // Login as admin (can also create orders)
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@university.edu', password: 'Admin@1234' });
  adminToken = adminLogin.body.data?.accessToken;

  // Login as cashier - requires an active shift - we'll use admin token for order tests
  cashierToken = adminToken;
  kitchenToken = adminToken;
});

describe('Orders API', () => {
  describe('POST /api/orders', () => {
    it('should reject order creation without authentication', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ items: [], totalAmount: 0 });
      expect(res.statusCode).toBe(401);
    });

    it('should reject order with no items', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [],
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject order with invalid items (missing menuItemId)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ name: 'Burger', quantity: 1, unitPrice: 5.0, subtotal: 5.0 }],
          subtotal: 5.0,
          taxAmount: 0.25,
          totalAmount: 5.25,
        });
      expect(res.statusCode).toBe(400);
    });

    it('should reject order with negative quantity', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{
            menuItemId: '00000000-0000-0000-0000-000000000000',
            name: 'Test',
            quantity: -1,
            unitPrice: 5.0,
            subtotal: 5.0,
          }],
          subtotal: 5.0,
          taxAmount: 0.25,
          totalAmount: 5.25,
        });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return 404 for non-existent order', async () => {
      const res = await request(app)
        .get('/api/orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.statusCode).toBe(404);
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .get('/api/orders/00000000-0000-0000-0000-000000000000');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    it('should reject invalid status values', async () => {
      const res = await request(app)
        .put('/api/orders/00000000-0000-0000-0000-000000000000/status')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: 'invalid_status_here' });
      // Either 400 (validation) or 404 (order not found) are acceptable
      expect([400, 404]).toContain(res.statusCode);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .put('/api/orders/00000000-0000-0000-0000-000000000000/status')
        .send({ status: 'preparing' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/orders', () => {
    it('should return orders list for kitchen staff', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${kitchenToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('orders');
      expect(Array.isArray(res.body.data.orders)).toBe(true);
    });

    it('should filter orders by status', async () => {
      const res = await request(app)
        .get('/api/orders?status=pending')
        .set('Authorization', `Bearer ${kitchenToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
});
