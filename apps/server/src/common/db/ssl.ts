import * as fs from 'node:fs';

export interface DbSslConfig {
  enabled?: boolean;
  rejectUnauthorized?: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

export interface PgSslOptions {
  rejectUnauthorized: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

/**
 * Builds PostgreSQL SSL connection options from configuration.
 * Supports CA certificate verification and mTLS client certificates/keys loaded from file paths.
 * Returns `false` if SSL is disabled or not configured.
 */
export const buildSslOptions = (sslConfig?: DbSslConfig | boolean | null): PgSslOptions | false => {
  if (!sslConfig) {
    return false;
  }

  if (typeof sslConfig === 'boolean') {
    return sslConfig ? { rejectUnauthorized: true } : false;
  }

  if (!sslConfig.enabled) {
    return false;
  }

  const rejectUnauthorized = sslConfig.rejectUnauthorized ?? true;

  const readCertFile = (filePath?: string): string | undefined => {
    if (!filePath) {
      return undefined;
    }
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return undefined;
  };

  return {
    rejectUnauthorized,
    ca: readCertFile(sslConfig.ca),
    cert: readCertFile(sslConfig.cert),
    key: readCertFile(sslConfig.key),
  };
};
