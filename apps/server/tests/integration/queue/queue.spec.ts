import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import type { Application } from 'express';
import { getApp } from '../../../src/app';
import { initConfig } from '../../../src/common/config';
import { QueueStatusService } from '../../../src/queue/models/queueStatusService';

describe('Queue Routes Integration', () => {
  let app: Application;
  let queueServiceMock: {
    getQueueStatus: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    await initConfig(true);
  });

  beforeEach(async () => {
    queueServiceMock = {
      getQueueStatus: vi.fn().mockResolvedValue({
        status: 'UP',
        timestamp: new Date().toISOString(),
        populatorServiceUrl: 'http://localhost:8081',
        dbConnected: true,
        queues: [{ queueName: 'tiles-buildings', total: 24, active: 0, queued: 24, failed: 0, completed: 0 }],
        summary: { totalJobs: 24, activeJobs: 0, queuedJobs: 24, failedJobs: 0, completedJobs: 0 },
      }),
    };

    const [appInstance] = await getApp({
      override: [
        {
          token: QueueStatusService,
          provider: { useValue: queueServiceMock },
        },
      ],
      useChild: true,
    });
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
