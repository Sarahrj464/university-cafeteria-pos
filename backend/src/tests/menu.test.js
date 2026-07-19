import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../index.js';
import { query } from '../config/db.js';

let adminToken;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@university.edu', password: 'Admin@1234' });
  adminToken = res.body.data?.accessToken;
});

describe('Menu API', () => {
  describe('GET /api/menu-items', () => {
    it('should return a list of menu items', async () => {
      const res = await request(app)
        .get('/api/menu-items')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('items');
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('should filter menu items by available=true', async () => {
      const res = await request(app)
        .get('/api/menu-items?available=true')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      if (res.body.data.items.length > 0) {
        res.body.data.items.forEach((item) => {
          expect(item.isAvailable ?? item.is_available).toBe(true);
        });
      }
    });

    it('should filter menu items by category', async () => {
      // Get categories first
      const catRes = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(catRes.statusCode).toBe(200);
      const categories = catRes.body.data?.categories || [];

      if (categories.length > 0) {
        const cat = categories[0];
        const res = await request(app)
          .get(`/api/menu-items?category=${cat.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });

    it('should return empty array for unknown category', async () => {
      const res = await request(app)
        .get('/api/menu-items?category=00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
    });
  });

  describe('GET /api/menu-items/barcode/:barcode', () => {
    it('should return 404 for an unknown barcode', async () => {
      const res = await request(app)
        .get('/api/menu-items/barcode/unknown-barcode-12345')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Product not found');
    });

    it('should return the requested item payload for a known barcode', async () => {
      const barcodeResult = await query(
        'SELECT barcode FROM menu_items WHERE barcode IS NOT NULL AND is_active = true LIMIT 1'
      );
      const barcode = barcodeResult.rows[0]?.barcode;

      if (!barcode) {
        return;
      }

      const res = await request(app)
        .get(`/api/menu-items/barcode/${barcode}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          name: expect.any(String),
          price: expect.any(Number),
          category_id: expect.anything(),
          image_url: expect.anything(),
        })
      );
    });
  });

  describe('GET /api/categories', () => {
    it('should return a list of categories', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('categories');
    });
  });

  describe('PATCH /api/admin/menu-items/:id/availability (admin)', () => {
    it('should reject availability toggle without admin token', async () => {
      const res = await request(app)
        .patch('/api/admin/menu-items/00000000-0000-0000-0000-000000000000/availability')
        .send({ isAvailable: false });
      expect(res.statusCode).toBe(401);
    });

    it('should accept availability toggle with admin token', async () => {
      // Grab first menu item id
      const menuRes = await request(app)
        .get('/api/menu-items')
        .set('Authorization', `Bearer ${adminToken}`);
      const items = menuRes.body.data?.items || [];
      if (items.length === 0) return; // skip if no items

      const item = items[0];
      const currentAvailability = item.isAvailable ?? item.is_available;

      const res = await request(app)
        .patch(`/api/admin/menu-items/${item.id}/availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isAvailable: !currentAvailability });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Restore original availability
      await request(app)
        .patch(`/api/admin/menu-items/${item.id}/availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isAvailable: currentAvailability });
    });
  });
});
