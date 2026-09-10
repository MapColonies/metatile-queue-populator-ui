import type { Logger } from '@map-colonies/js-logger';
import { inject, singleton } from 'tsyringe';
import { PgBoss } from 'pg-boss';
import { SERVICES } from '../../common/constants';
import type { ConfigType } from '../../common/config';
import { buildSslOptions } from '../../common/db/ssl';
import { DiscoveryService } from '../../discovery/models/discoveryService';

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
  targetId?: string;
  targetName?: string;
  databaseName?: string;
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
  private readonly defaultPopulatorUrl: string;
  private readonly defaultProjectName: string;
  private readonly pgbossPool = new Map<string, PgBoss>();

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(DiscoveryService) private readonly discoveryService?: DiscoveryService
  ) {
    this.defaultPopulatorUrl = (this.config.get as any)('populator.url') ?? 'http://localhost:8081';
    this.defaultProjectName = (this.config.get as any)('app.projectName') ?? 'buildings';
  }

  private getPgBossForDatabase(databaseName: string): PgBoss | null {
    if (this.pgbossPool.has(databaseName)) {
      return this.pgbossPool.get(databaseName)!;
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
          database: databaseName,
          schema: dbConfig.schema ?? 'pgboss',
          application_name: `metatile-queue-populator-ui-${databaseName}`,
          ssl: sslOptions || undefined,
        });

        // Attach error event listener so background pool connection timeouts do not crash the process
        instance.on('error', (err: any) => {
          this.logger.warn({ msg: 'PgBoss background error encountered', database: databaseName, error: err.message });
        });

        this.pgbossPool.set(databaseName, instance);
        return instance;
      }
    } catch (err: any) {
      this.logger.warn({ msg: 'Could not initialize PgBoss connection', database: databaseName, err: err.message });
    }
    return null;
  }

  public async getQueueStatus(targetId?: string): Promise<QueueOverview> {
    let projectName = this.defaultProjectName;
    let populatorUrl = this.defaultPopulatorUrl;
    let targetName = this.defaultProjectName;
    let resolvedTargetId = targetId || this.defaultProjectName;
    let dbName = (this.config.get as any)('db.database') ?? `vector-rendering-${projectName}`;

    if (this.discoveryService) {
      const target = await this.discoveryService.getTarget(targetId);
      if (target) {
        projectName = target.projectName;
        populatorUrl = target.url;
        targetName = target.name;
        resolvedTargetId = target.id;
        dbName = target.dbName;
      }
    }

    this.logger.debug({
      msg: 'Fetching queue metrics and health overview',
      targetId: resolvedTargetId,
      projectName,
      dbName,
    });

    let populatorHealthy = false;
    try {
      const healthRes = await fetch(`${populatorUrl}/docs/api/`, { method: 'HEAD' }).catch(() => null);
      populatorHealthy = !!healthRes;
    } catch {
      populatorHealthy = false;
    }

    let dbConnected = false;
    const requestPrefix = 'tiles-requests';
    const tilesPrefix = 'tiles';
    const targetRequestQueue = `${requestPrefix}-${projectName}`;
    const targetTilesQueue = `${tilesPrefix}-${projectName}`;
    const queues: QueueStat[] = [];

    const pgboss = this.getPgBossForDatabase(dbName);

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
        this.logger.warn({
          msg: 'Postgres / pg-boss connection unreachable, returning telemetry state',
          database: dbName,
          error: err.message,
        });
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
      populatorServiceUrl: populatorUrl,
      targetId: resolvedTargetId,
      targetName,
      databaseName: dbName,
      dbConnected,
      queues,
      summary,
    };
  }
}
