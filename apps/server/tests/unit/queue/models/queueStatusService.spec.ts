import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { QueueStatusService } from '../../../../src/queue/models/queueStatusService';
import { jsLogger } from '@map-colonies/js-logger';
import * as sslModule from '../../../../src/common/db/ssl';
import { PgBoss } from 'pg-boss';

vi.mock('pg-boss', () => {
  const MockPgBoss = vi.fn().mockImplementation(function (options: any) {
    return {
      options,
      on: vi.fn(),
      getQueue: vi.fn().mockResolvedValue({ id: 'test' }),
      getQueueSize: vi.fn().mockResolvedValue(0),
      countStates: vi.fn().mockResolvedValue({ active: 0, queued: 0, failed: 0, completed: 0 }),
    };
  });
  return {
    PgBoss: MockPgBoss,
  };
});

describe('QueueStatusService', async () => {
  let queueService: QueueStatusService;
  const configMock = {
    get: vi.fn().mockImplementation((key: string) => {
      if (key === 'populator.url') return 'http://localhost:8081';
      if (key === 'app.projectName') return 'default';
      if (key === 'db') {
        return {
          host: 'localhost',
          port: 5432,
          username: 'db_user',
          password: 'db_password',
          database: 'vector-rendering-buildings',
          schema: 'pgboss',
          ssl: {
            enabled: true,
            ca: '/path/to/ca.crt',
            cert: '/path/to/client.crt',
            key: '/path/to/client.key',
          },
        };
      }
      return undefined;
    }),
  };
  const logger = await jsLogger({ enabled: false });

  beforeEach(() => {
    vi.clearAllMocks();
    queueService = new QueueStatusService(configMock as any, logger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return queue overview and initialize PgBoss with SSL options', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ name: 'test-queue' }]),
    });

    const buildSslSpy = vi.spyOn(sslModule, 'buildSslOptions').mockReturnValue({
      rejectUnauthorized: true,
      ca: 'CA_DATA',
      cert: 'CERT_DATA',
      key: 'KEY_DATA',
    });

    const overview = await queueService.getQueueStatus();

    expect(overview).toHaveProperty('status');
    expect(overview).toHaveProperty('summary');
    expect(buildSslSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        ca: '/path/to/ca.crt',
      })
    );
    expect(PgBoss).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'localhost',
        ssl: {
          rejectUnauthorized: true,
          ca: 'CA_DATA',
          cert: 'CERT_DATA',
          key: 'KEY_DATA',
        },
      })
    );
  });
});
