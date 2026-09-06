import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import type { Application } from 'express';
import { getApp } from '../../../src/app';
import { initConfig } from '../../../src/common/config';

describe('Presets Routes Integration', () => {
  let app: Application;

  beforeAll(async () => {
    await initConfig(true);
  });

  beforeEach(async () => {
    const [appInstance] = await getApp({ useChild: true });
    app = appInstance;
  });

  describe('GET /presets and POST /presets', () => {
    it('should return list of presets', async () => {
      const response = await supertest(app).get('/presets');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should create and delete a preset', async () => {
      const payload = {
        name: 'Haifa Port Area',
        minZoom: 5,
        maxZoom: 14,
        area: [34.95, 32.78, 35.05, 32.84],
      };

      const postRes = await supertest(app).post('/presets').send(payload).set('Content-Type', 'application/json');

      expect(postRes.status).toBe(201);
      expect(postRes.body).toHaveProperty('id');
      const presetId = postRes.body.id;

      const deleteRes = await supertest(app).delete(`/presets/${presetId}`);
      expect(deleteRes.status).toBe(200);
    });
  });
});
