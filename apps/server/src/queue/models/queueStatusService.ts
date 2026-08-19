import type { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { PgBoss } from 'pg-boss';
import { SERVICES } from '../../common/constants';
import type { ConfigType } from '../../common/config';

export interface QueueStat {
  queueName: string;
  total: number;
  active: number;
  queued: number;
  failed: number;
  completed: number;
}

export interface QueueOverview {
  status: 'UP' | 'DEGRADED' | 'DOWN';
  timestamp: string;
  populatorServiceUrl: string;
  dbConnected: boolean;
  queues: QueueStat[];
  summary: {
    totalJobs: number;
    activeJobs: number;
    queuedJobs: number;
    failedJobs: number;
    completedJobs: number;
  };
}

@injectable()
export class QueueStatusService {
  private readonly populatorUrl: string;
  private readonly projectName: string;
  private pgbossInstance: PgBoss | null = null;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.LOGGER) private readonly logger: Logger
  ) {
    this.populatorUrl = (this.config.get as any)('populator.url') ?? 'http://localhost:8081';
    this.projectName = (this.config.get as any)('app.projectName') ?? 'default';
  }

  private getPgBoss(): PgBoss | null {
    if (this.pgbossInstance) {
      return this.pgbossInstance;
    }

    try {
      const dbConfig = (this.config.get as any)('db');
      if (dbConfig) {
        this.pgbossInstance = new PgBoss({
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          schema: dbConfig.schema ?? 'pgboss',
          application_name: 'metatile-queue-populator-ui',
        });
        return this.pgbossInstance;
      }
    } catch (err: any) {
      this.logger.warn({ msg: 'Could not initialize PgBoss connection', err: err.message });
    }
    return null;
  }

  public async getQueueStatus(): Promise<QueueOverview> {
    this.logger.debug({ msg: 'Fetching queue metrics and health overview' });

    let populatorHealthy = false;
    try {
      const healthRes = await fetch(`${this.populatorUrl}/docs/api/`, { method: 'HEAD' }).catch(() => null);
      populatorHealthy = !!healthRes;
    } catch {
      populatorHealthy = false;
    }

    let dbConnected = false;
    const requestQueueName = `tile-request-queue-${this.projectName}`;
    const tilesQueueName = `tiles-queue-${this.projectName}`;
    const queueNames = [requestQueueName, tilesQueueName];
    const queues: QueueStat[] = [];

    const pgboss = this.getPgBoss();

    if (pgboss) {
      try {
        await pgboss.start();
        dbConnected = true;

        for (const name of queueNames) {
          const rawStats: any = await pgboss.getQueueStats(name);
          const stats = Array.isArray(rawStats) ? rawStats[0] ?? {} : rawStats ?? {};
          queues.push({
            queueName: name,
            total: stats.totalCount ?? stats.total ?? 0,
            active: stats.activeCount ?? stats.active ?? 0,
            queued: stats.queuedCount ?? stats.queued ?? 0,
            failed: stats.failedCount ?? stats.failed ?? 0,
            completed: stats.completedCount ?? stats.completed ?? 0,
          });
        }
      } catch (err: any) {
        this.logger.warn({ msg: 'Postgres / pg-boss connection unreachable, returning telemetry state', error: err.message });
      }
    }

    if (queues.length === 0) {
      // Fallback empty telemetry when DB is starting or offline
      queues.push(
        { queueName: requestQueueName, total: 0, active: 0, queued: 0, failed: 0, completed: 0 },
        { queueName: tilesQueueName, total: 0, active: 0, queued: 0, failed: 0, completed: 0 }
      );
    }

    const summary = queues.reduce(
      (acc, q) => ({
        totalJobs: acc.totalJobs + q.total,
        activeJobs: acc.activeJobs + q.active,
        queuedJobs: acc.queuedJobs + q.queued,
        failedJobs: acc.failedJobs + q.failed,
        completedJobs: acc.completedJobs + q.completed,
      }),
      { totalJobs: 0, activeJobs: 0, queuedJobs: 0, failedJobs: 0, completedJobs: 0 }
    );

    const overallStatus = populatorHealthy && dbConnected ? 'UP' : populatorHealthy || dbConnected ? 'DEGRADED' : 'DOWN';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      populatorServiceUrl: this.populatorUrl,
      dbConnected,
      queues,
      summary,
    };
  }
}
