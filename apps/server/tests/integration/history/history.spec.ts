import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { Application } from 'express';
import { getApp } from '../../../src/app';
import { initConfig } from '../../../src/common/config';

describe('History Routes Integration', () => {
  let app: Application;

  beforeAll(async () => {
    await initConfig(true);
  });

  beforeEach(async () => {
    const [appInstance] = await getApp({ useChild: true });
    app = appInstance;
  });

  describe('POST /history and GET /history', () => {
    it('should record new submission and return it via GET /history', async () => {
      const newRecord = {
        type: 'area',
        parameters: { minZoom: 0, maxZoom: 5, area: [34, 31, 35, 32] },
        status: 'SUCCESS',
        responseMessage: 'Added to queue',
      };

      const postResponse = await supertest(app)
        .post('/history')
        .send(newRecord)
        .set('Content-Type', 'application/json');

      expect(postResponse.status).toBe(201);
      expect(postResponse.body).toHaveProperty('id');

      const getResponse = await supertest(app).get('/history');
      expect(getResponse.status).toBe(200);
      expect(Array.isArray(getResponse.body)).toBe(true);
      expect(getResponse.body.length).toBeGreaterThan(0);
    });
  });
});
