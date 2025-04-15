
import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';

describe('Bookkeeping Routes', () => {
  describe('Wave Integration', () => {
    it('should validate Wave API credentials', async () => {
      const response = await request(app)
        .post('/api/bookkeeping/validate-wave')
        .send({ apiKey: 'test-key' })
        .expect(200);

      expect(response.body.success).toBeTruthy();
    });
  });

  describe('Transaction Sync', () => {
    it('should sync transactions from DoorLoop', async () => {
      const response = await request(app)
        .post('/api/bookkeeping/sync-doorloop')
        .expect(200);

      expect(response.body.success).toBeTruthy();
      expect(Array.isArray(response.body.data)).toBeTruthy();
    });

    it('should push transactions to Wave', async () => {
      const response = await request(app)
        .post('/api/bookkeeping/push-to-wave')
        .expect(200);

      expect(response.body.success).toBeTruthy();
    });
  });
});
