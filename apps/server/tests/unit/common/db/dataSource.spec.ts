import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataSource } from 'typeorm';
import { createDataSource } from '../../../../src/common/db/dataSource';
import * as sslModule from '../../../../src/common/db/ssl';

vi.mock('typeorm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('typeorm')>();
  const MockDataSource = vi.fn().mockImplementation(function (options: any) {
    return {
      options,
      initialize: vi.fn().mockResolvedValue(true),
    };
  });
  return {
    ...actual,
    DataSource: MockDataSource,
  };
});

describe('createDataSource', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null instance when appDb.host is missing', async () => {
    const mockConfig = {
      get: vi.fn().mockReturnValue(undefined),
    } as any;

    const result = await createDataSource(mockConfig, mockLogger);
    expect(result.instance).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ msg: expect.stringContaining('No appDb configuration found') })
    );
  });

  it('creates DataSource with password and ssl false by default', async () => {
    const mockConfig = {
      get: vi.fn().mockReturnValue({
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'password123',
        database: 'test_db',
        ssl: { enabled: false },
      }),
    } as any;

    const result = await createDataSource(mockConfig, mockLogger);
    expect(result.instance).not.toBeNull();
    expect(DataSource).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'postgres',
        host: 'localhost',
        username: 'postgres',
        password: 'password123',
        ssl: false,
      })
    );
  });

  it('creates DataSource with mTLS cert options when ssl is configured', async () => {
    const buildSslSpy = vi.spyOn(sslModule, 'buildSslOptions').mockReturnValue({
      rejectUnauthorized: true,
      ca: 'CA_CERT_CONTENT',
      cert: 'CLIENT_CERT_CONTENT',
      key: 'CLIENT_KEY_CONTENT',
    });

    const mockConfig = {
      get: vi.fn().mockReturnValue({
        host: 'localhost',
        port: 5432,
        username: 'app_user',
        password: '',
        database: 'test_db',
        ssl: {
          enabled: true,
          ca: '/path/ca.crt',
          cert: '/path/client.crt',
          key: '/path/client.key',
        },
      }),
    } as any;

    const result = await createDataSource(mockConfig, mockLogger);
    expect(result.instance).not.toBeNull();
    expect(buildSslSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        ca: '/path/ca.crt',
      })
    );
    expect(DataSource).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'postgres',
        ssl: {
          rejectUnauthorized: true,
          ca: 'CA_CERT_CONTENT',
          cert: 'CLIENT_CERT_CONTENT',
          key: 'CLIENT_KEY_CONTENT',
        },
      })
    );
  });
});
