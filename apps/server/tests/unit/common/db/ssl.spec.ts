import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

import { buildSslOptions, type DbSslConfig } from '../../../../src/common/db/ssl';

describe('buildSslOptions', () => {
  const existsSyncMock = vi.mocked(fs.existsSync);
  const readFileSyncMock = vi.mocked(fs.readFileSync);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns false when sslConfig is undefined or null', () => {
    expect(buildSslOptions(undefined)).toBe(false);
    expect(buildSslOptions(null as any)).toBe(false);
  });

  it('returns false when sslConfig.enabled is false', () => {
    const config: DbSslConfig = { enabled: false };
    expect(buildSslOptions(config)).toBe(false);
  });

  it('returns false when sslConfig is boolean false', () => {
    expect(buildSslOptions(false as any)).toBe(false);
  });

  it('builds ssl options with rejectUnauthorized true by default when boolean true', () => {
    expect(buildSslOptions(true as any)).toEqual({
      rejectUnauthorized: true,
      ca: undefined,
      cert: undefined,
      key: undefined,
    });
  });

  it('builds ssl options with rejectUnauthorized true by default when enabled', () => {
    const config: DbSslConfig = { enabled: true };
    const options = buildSslOptions(config);

    expect(options).toEqual({
      rejectUnauthorized: true,
      ca: undefined,
      cert: undefined,
      key: undefined,
    });
  });

  it('respects explicit rejectUnauthorized = false', () => {
    const config: DbSslConfig = { enabled: true, rejectUnauthorized: false };
    const options = buildSslOptions(config);

    expect(options).toEqual({
      rejectUnauthorized: false,
      ca: undefined,
      cert: undefined,
      key: undefined,
    });
  });

  it('reads CA file when path exists', () => {
    existsSyncMock.mockImplementation((path) => path === '/etc/pki/ca.crt');
    readFileSyncMock.mockImplementation((path) => {
      if (path === '/etc/pki/ca.crt') return '---CA CONTENT---';
      throw new Error('Not found');
    });

    const config: DbSslConfig = {
      enabled: true,
      ca: '/etc/pki/ca.crt',
    };

    const options = buildSslOptions(config);
    expect(options).toEqual({
      rejectUnauthorized: true,
      ca: '---CA CONTENT---',
      cert: undefined,
      key: undefined,
    });
  });

  it('reads CA, cert and key files when paths exist for full mTLS', () => {
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockImplementation((path) => `CONTENT_OF_${path}`);

    const config: DbSslConfig = {
      enabled: true,
      rejectUnauthorized: true,
      ca: '/etc/pki/ca.crt',
      cert: '/etc/pki/client.crt',
      key: '/etc/pki/client.key',
    };

    const options = buildSslOptions(config);
    expect(options).toEqual({
      rejectUnauthorized: true,
      ca: 'CONTENT_OF_/etc/pki/ca.crt',
      cert: 'CONTENT_OF_/etc/pki/client.crt',
      key: 'CONTENT_OF_/etc/pki/client.key',
    });
  });

  it('ignores file paths if they do not exist on disk', () => {
    existsSyncMock.mockReturnValue(false);

    const config: DbSslConfig = {
      enabled: true,
      ca: '/missing/ca.crt',
      cert: '/missing/client.crt',
      key: '/missing/client.key',
    };

    const options = buildSslOptions(config);
    expect(readFileSyncMock).not.toHaveBeenCalled();
    expect(options).toEqual({
      rejectUnauthorized: true,
      ca: undefined,
      cert: undefined,
      key: undefined,
    });
  });
});
