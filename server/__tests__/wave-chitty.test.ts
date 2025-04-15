
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as waveChitty from '../services/wave-chitty';
import request from 'supertest';
import { app } from '../index';

describe('Wave Chitty Integration', () => {
  describe('GET /api/wave/businesses', () => {
    it('should return businesses list', async () => {
      const response = await request(app)
        .get('/api/wave/businesses')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/wave/customers', () => {
    it('should create a new customer', async () => {
      const customerData = {
        name: 'Test Customer',
        email: 'test@example.com',
        address: '123 Test St'
      };

      const response = await request(app)
        .post('/api/wave/customers')
        .send(customerData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(customerData.name);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/wave/customers')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });
  });

  describe('POST /api/wave/property-transaction', () => {
    it('should create a property transaction', async () => {
      const transactionData = {
        businessId: 'test-business',
        propertyId: 1,
        transactionType: 'expense',
        amount: 100,
        description: 'Test transaction',
        category: 'maintenance'
      };

      const response = await request(app)
        .post('/api/wave/property-transaction')
        .send(transactionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(transactionData.amount);
    });
  });
});
