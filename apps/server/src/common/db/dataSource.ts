import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import type { ConfigType } from '../config';
import type { Logger } from '@map-colonies/js-logger';
import { PresetEntity } from '../../presets/models/presetEntity';
import { HistoryEntity } from '../../history/models/historyEntity';
import { AuditLogEntity } from '../../audit/models/auditLogEntity';

import { buildSslOptions } from './ssl';

export interface DataSourceWrapper {
  instance: DataSource | null;
}

export const DATA_SOURCE_SYMBOL = Symbol('DATA_SOURCE');

export const createDataSource = async (config: ConfigType, logger: Logger): Promise<DataSourceWrapper> => {
  const dbConfig = (config.get as any)('appDb');
  if (!dbConfig?.host) {
    logger.warn({ msg: 'No appDb configuration found, running without TypeORM database persistence' });
    return { instance: null };
  }

  const sslOptions = buildSslOptions(dbConfig.ssl);

  const options: DataSourceOptions = {
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port ?? 5432,
    username: process.env.APP_DB_USERNAME || dbConfig.username,
    password: process.env.APP_DB_PASSWORD || dbConfig.password,
    database: dbConfig.database,
    schema: dbConfig.schema ?? 'public',
    synchronize: dbConfig.synchronize ?? false,
    logging: dbConfig.logging ?? false,
    entities: [PresetEntity, HistoryEntity, AuditLogEntity],
    ssl: sslOptions,
  };

  const dataSource = new DataSource(options);

  try {
    await dataSource.initialize();
    logger.info({ msg: 'TypeORM DataSource initialized successfully', database: dbConfig.database });
    return { instance: dataSource };
  } catch (err: any) {
    logger.warn({ msg: 'Failed to initialize TypeORM DataSource, continuing with in-memory fallback', error: err.message });
    return { instance: null };
  }
};
