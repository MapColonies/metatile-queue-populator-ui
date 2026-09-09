import type { Logger } from '@map-colonies/js-logger';
import { inject, injectable, singleton } from 'tsyringe';
import { PgBoss } from 'pg-boss';
import { SERVICES } from '../../common/constants';
import type { ConfigType } from '../../common/config';
import { buildSslOptions } from '../../common/db/ssl';

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

@singleton()
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
      if (dbConfig?.host) {
        const sslOptions = buildSslOptions(dbConfig.ssl);
        const user = process.env.DB_USERNAME || dbConfig.username;
        const password = process.env.DB_PASSWORD || dbConfig.password;
        const instance = new PgBoss({
          host: dbConfig.host,
          port: dbConfig.port,
          user,
          password,
          database: dbConfig.database,
          schema: dbConfig.schema ?? 'pgboss',
          application_name: 'metatile-queue-populator-ui',
          ssl: sslOptions || undefined,
        });

        // Attach error event listener so background pool connection timeouts do not crash the process
        instance.on('error', (err: any) => {
          this.logger.warn({ msg: 'PgBoss background error encountered', error: err.message });
        });

        this.pgbossInstance = instance;
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
    const requestPrefix = 'tiles-requests';
    const tilesPrefix = 'tiles';
    const targetRequestQueue = `${requestPrefix}-${this.projectName}`;
    const targetTilesQueue = `${tilesPrefix}-${this.projectName}`;
    const queues: QueueStat[] = [];

    const pgboss = this.getPgBoss();

    if (pgboss) {
      try {
        await pgboss.start();
        dbConnected = true;

        const allQueues = await pgboss.getQueues();

        // Find matching or related queues in pg-boss
        const relevantQueues = allQueues.filter(
          (q) => q.name === targetRequestQueue || q.name === targetTilesQueue || q.name.startsWith(requestPrefix) || q.name.startsWith(tilesPrefix)
        );

        if (relevantQueues.length > 0) {
          for (const q of relevantQueues) {
            const rawStats: any = await pgboss.getQueueStats(q.name).catch(() => null);
            const stats = Array.isArray(rawStats) ? (rawStats[0] ?? {}) : (rawStats ?? {});
            queues.push({
              queueName: q.name,
              total: q.totalCount ?? stats.totalCount ?? 0,
              active: q.activeCount ?? stats.activeCount ?? 0,
              queued: (q.queuedCount ?? stats.queuedCount ?? 0) + (q.deferredCount ?? 0),
              failed: q.failedCount ?? stats.failedCount ?? 0,
              completed: q.readyCount ?? stats.completedCount ?? 0,
            });
          }
        } else {
          for (const name of [targetRequestQueue, targetTilesQueue]) {
            const rawStats: any = await pgboss.getQueueStats(name).catch(() => null);
            const stats = Array.isArray(rawStats) ? (rawStats[0] ?? {}) : (rawStats ?? {});
            queues.push({
              queueName: name,
              total: stats.totalCount ?? 0,
              active: stats.activeCount ?? 0,
              queued: stats.queuedCount ?? 0,
              failed: stats.failedCount ?? 0,
              completed: stats.completedCount ?? 0,
            });
          }
        }
      } catch (err: any) {
        this.logger.warn({ msg: 'Postgres / pg-boss connection unreachable, returning telemetry state', error: err.message });
      }
    }

    if (queues.length === 0) {
      // Fallback empty telemetry when DB is starting or offline
      queues.push(
        { queueName: targetRequestQueue, total: 0, active: 0, queued: 0, failed: 0, completed: 0 },
        { queueName: targetTilesQueue, total: 0, active: 0, queued: 0, failed: 0, completed: 0 }
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
