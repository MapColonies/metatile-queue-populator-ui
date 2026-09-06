import type { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { randomUUID } from 'crypto';
import type { Repository, FindOptionsWhere } from 'typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { SERVICES } from '../../common/constants';
import { AuditLogEntity } from './auditLogEntity';

export interface AuditRecord {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  clientIp?: string;
  userAgent?: string;
  requestBody?: Record<string, any>;
  queryParams?: Record<string, any>;
  details?: string;
}

export interface AuditQueryOptions {
  limit?: number;
  method?: string;
  statusCode?: number;
  from?: string;
  to?: string;
  pathPrefix?: string;
}

@injectable()
export class AuditService {
  private inMemoryAuditLogs: AuditRecord[] = [];
  private auditRepository: Repository<AuditLogEntity> | null = null;
  private readonly maxMemoryLogs = 500;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.DATA_SOURCE) private readonly dataSourceWrapper: any
  ) {
    const ds = this.dataSourceWrapper?.instance ?? (this.dataSourceWrapper?.isInitialized ? this.dataSourceWrapper : null);
    if (ds?.isInitialized) {
      this.auditRepository = ds.getRepository(AuditLogEntity);
    }
  }

  public async logEvent(entry: Omit<AuditRecord, 'id' | 'timestamp'>): Promise<AuditRecord> {
    const record: AuditRecord = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry,
    };

    if (this.auditRepository) {
      try {
        const entity = this.auditRepository.create({
          id: record.id,
          timestamp: record.timestamp,
          method: record.method,
          path: record.path,
          statusCode: record.statusCode,
          durationMs: record.durationMs,
          clientIp: record.clientIp,
          userAgent: record.userAgent,
          requestBody: record.requestBody,
          queryParams: record.queryParams,
          details: record.details,
        });
        await this.auditRepository.save(entity);
        return record;
      } catch (err: any) {
        this.logger.warn({ msg: 'Failed to persist audit log to database, buffering in memory', error: err.message });
      }
    }

    this.inMemoryAuditLogs.unshift(record);
    if (this.inMemoryAuditLogs.length > this.maxMemoryLogs) {
      this.inMemoryAuditLogs.pop();
    }

    return record;
  }

  public async getAuditLogs(options: AuditQueryOptions = {}): Promise<AuditRecord[]> {
    const limit = Math.min(options.limit ?? 50, 200);

    if (this.auditRepository) {
      try {
        const where: FindOptionsWhere<AuditLogEntity> = {};
        if (options.method) where.method = options.method.toUpperCase();
        if (options.statusCode) where.statusCode = options.statusCode;

        if (options.from && options.to) {
          where.timestamp = Between(options.from, options.to);
        } else if (options.from) {
          where.timestamp = MoreThanOrEqual(options.from);
        } else if (options.to) {
          where.timestamp = LessThanOrEqual(options.to);
        }

        const entities = await this.auditRepository.find({
          where,
          order: { timestamp: 'DESC' },
          take: limit,
        });

        return entities.map((e) => ({
          id: e.id,
          timestamp: e.timestamp,
          method: e.method,
          path: e.path,
          statusCode: e.statusCode,
          durationMs: e.durationMs,
          clientIp: e.clientIp,
          userAgent: e.userAgent,
          requestBody: e.requestBody,
          queryParams: e.queryParams,
          details: e.details,
        }));
      } catch (err: any) {
        this.logger.warn({ msg: 'Failed to fetch audit logs from database, using memory fallback', error: err.message });
      }
    }

    let records = this.inMemoryAuditLogs;
    if (options.method) records = records.filter((r) => r.method.toUpperCase() === options.method!.toUpperCase());
    if (options.statusCode) records = records.filter((r) => r.statusCode === options.statusCode);
    if (options.from) records = records.filter((r) => r.timestamp >= options.from!);
    if (options.to) records = records.filter((r) => r.timestamp <= options.to!);

    return records.slice(0, limit);
  }
}
