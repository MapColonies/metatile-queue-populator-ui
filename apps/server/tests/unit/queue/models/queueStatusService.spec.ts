import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueueStatusService } from '../../../../src/queue/models/queueStatusService';
import { jsLogger } from '@map-colonies/js-logger';

describe('QueueStatusService', async () => {
  let queueService: QueueStatusService;
  const configMock = {
    get: vi.fn().mockReturnValue('http://localhost:8081'),
  };
  const logger = await jsLogger({ enabled: false });

  beforeEach(() => {
    vi.restoreAllMocks();
    queueService = new QueueStatusService(configMock as any, logger);
  });

  it('should return queue overview with summary and queues breakdown', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    const overview = await queueService.getQueueStatus();

    expect(overview).toHaveProperty('status');
    expect(overview).toHaveProperty('summary');
    expect(overview.queues.length).toBeGreaterThan(0);
    expect(overview.summary.totalJobs).toBeGreaterThan(0);
  });
});
