import type { Logger } from '@map-colonies/js-logger';
import { inject, injectable, singleton } from 'tsyringe';
import { randomUUID } from 'crypto';
import type { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { SERVICES } from '../../common/constants';
import { DATA_SOURCE_SYMBOL } from '../../common/db/dataSource';
import { HistoryEntity } from './historyEntity';

export interface HistoryRecord {
  id: string;
  type: 'area' | 'list';
  timestamp: string;
  parameters: Record<string, any>;
  summary: string;
  status: 'SUCCESS' | 'FAILED';
  responseMessage?: string;
}

export interface HistoryQueryOptions {
  limit?: number;
  type?: 'area' | 'list';
  status?: 'SUCCESS' | 'FAILED';
  from?: string;
  to?: string;
}

@injectable()
export class HistoryService {
  private inMemoryRecords: HistoryRecord[] = [];
  private historyRepository: Repository<HistoryEntity> | null = null;
  private readonly maxMemoryRecords = 200;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.DATA_SOURCE) private readonly dataSourceWrapper: any
  ) {
    const ds = this.dataSourceWrapper?.instance ?? (this.dataSourceWrapper?.isInitialized ? this.dataSourceWrapper : null);
    if (ds?.isInitialized) {
      this.historyRepository = ds.getRepository(HistoryEntity);
    }
  }

  public async recordSubmission(
    type: 'area' | 'list',
    parameters: Record<string, any>,
    status: 'SUCCESS' | 'FAILED',
    responseMessage?: string
  ): Promise<HistoryRecord> {
    let summary = '';
    if (type === 'area') {
      const minZ = parameters.minZoom ?? 0;
      const maxZ = parameters.maxZoom ?? 10;
      const areaType = Array.isArray(parameters.area) ? 'BBOX' : 'GeoJSON Polygon';
      summary = `Area Job (Z${minZ}-Z${maxZ}, ${areaType})`;
    } else {
      const count = Array.isArray(parameters.tiles) ? parameters.tiles.length : 0;
      summary = `Tile List Job (${count} metatiles)`;
    }

    const record: HistoryRecord = {
      id: randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      parameters,
      summary,
      status,
      responseMessage,
    };

    if (this.historyRepository) {
      try {
        const entity = this.historyRepository.create({
          id: record.id,
          timestamp: record.timestamp,
          type: record.type,
          parameters: record.parameters,
          status: record.status,
          responseMessage: record.responseMessage,
        });
        await this.historyRepository.save(entity);
        this.logger.info({ msg: 'Recorded job history in PostgreSQL', recordId: record.id, summary });
        return record;
      } catch (err: any) {
        this.logger.warn({ msg: 'Failed to persist history record to database, storing in memory', error: err.message });
      }
    }

    this.inMemoryRecords.unshift(record);
    if (this.inMemoryRecords.length > this.maxMemoryRecords) {
      this.inMemoryRecords.pop();
    }

    this.logger.info({ msg: 'Recorded job history in memory', recordId: record.id, summary });
    return record;
  }

  public async getHistory(options: HistoryQueryOptions = {}): Promise<HistoryRecord[]> {
    const limit = options.limit ?? 50;

    if (this.historyRepository) {
      try {
        const where: FindOptionsWhere<HistoryEntity> = {};
        if (options.type) where.type = options.type;
        if (options.status) where.status = options.status;

        if (options.from && options.to) {
          where.timestamp = Between(options.from, options.to) as any;
        } else if (options.from) {
          where.timestamp = MoreThanOrEqual(options.from) as any;
        } else if (options.to) {
          where.timestamp = LessThanOrEqual(options.to) as any;
        }

        const entities = await this.historyRepository.find({
          where,
          order: { timestamp: 'DESC' },
          take: limit,
        });

        return entities.map((e) => {
          let summary = '';
          if (e.type === 'area') {
            const minZ = e.parameters.minZoom ?? 0;
            const maxZ = e.parameters.maxZoom ?? 10;
            const areaType = Array.isArray(e.parameters.area) ? 'BBOX' : 'GeoJSON Polygon';
            summary = `Area Job (Z${minZ}-Z${maxZ}, ${areaType})`;
          } else {
            const count = Array.isArray(e.parameters.tiles) ? e.parameters.tiles.length : 0;
            summary = `Tile List Job (${count} metatiles)`;
          }
          return {
            id: e.id,
            type: e.type,
            timestamp: e.timestamp,
            parameters: e.parameters,
            summary,
            status: e.status,
            responseMessage: e.responseMessage,
          };
        });
      } catch (err: any) {
        this.logger.warn({ msg: 'Failed to query history from database, using memory fallback', error: err.message });
      }
    }

    let records = this.inMemoryRecords;
    if (options.type) records = records.filter((r) => r.type === options.type);
    if (options.status) records = records.filter((r) => r.status === options.status);
    if (options.from) records = records.filter((r) => r.timestamp >= options.from!);
    if (options.to) records = records.filter((r) => r.timestamp <= options.to!);

    return records.slice(0, limit);
  }

  public async clearHistory(): Promise<void> {
    if (this.historyRepository) {
      try {
        await this.historyRepository.clear();
      } catch (err: any) {
        this.logger.warn({ msg: 'Failed to clear history from database', error: err.message });
      }
    }
    this.inMemoryRecords = [];
  }
}
