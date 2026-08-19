import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import { Application } from 'express';
import { getApp } from '../../../src/app';
import { initConfig } from '../../../src/common/config';

describe('Queue Routes Integration', () => {
  let app: Application;

  beforeAll(async () => {
    await initConfig(true);
  });

  beforeEach(async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    const [appInstance] = await getApp({ useChild: true });
    app = appInstance;
  });

  describe('GET /queue/status', () => {
    it('should return 200 OK with queue overview and status', async () => {
      const response = await supertest(app).get('/queue/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('queues');
    });
  });

  describe('GET /queue/metrics', () => {
    it('should return 200 OK with metrics overview', async () => {
      const response = await supertest(app).get('/queue/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
    });
  });
});
