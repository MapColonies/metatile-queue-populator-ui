import express, { json, Router } from 'express';
import compression from 'compression';
import { OpenapiViewerRouter } from '@map-colonies/openapi-express-viewer';
import { getErrorHandlerMiddleware } from '@map-colonies/error-express-handler';
import { middleware as OpenApiMiddleware } from 'express-openapi-validator';
import { inject, injectable } from 'tsyringe';
import type { Logger } from '@map-colonies/js-logger';
import { httpLogger } from '@map-colonies/express-access-log-middleware';
import { collectMetricsExpressMiddleware } from '@map-colonies/prometheus';
import { Registry } from 'prom-client';
import type { ConfigType } from '@common/config';
import { SERVICES } from '@common/constants';
import { TILES_ROUTER_SYMBOL } from './tiles/routes/tilesRouter';
import { SPATIAL_ROUTER_SYMBOL } from './spatial/routes/spatialRouter';
import { QUEUE_ROUTER_SYMBOL } from './queue/routes/queueRouter';
import { HISTORY_ROUTER_SYMBOL } from './history/routes/historyRouter';
import { PRESET_ROUTER_SYMBOL } from './presets/routes/presetRouter';
import { RASTER_ROUTER_SYMBOL } from './raster/routes/rasterRouter';
import { AUDIT_ROUTER_SYMBOL } from './audit/routes/auditRouter';
import { AuditService } from './audit/models/auditService';

@injectable()
export class ServerBuilder {
  private readonly serverInstance: express.Application;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.METRICS) private readonly metricsRegistry: Registry,
    @inject(TILES_ROUTER_SYMBOL) private readonly tilesRouter: Router,
    @inject(SPATIAL_ROUTER_SYMBOL) private readonly spatialRouter: Router,
    @inject(QUEUE_ROUTER_SYMBOL) private readonly queueRouter: Router,
    @inject(HISTORY_ROUTER_SYMBOL) private readonly historyRouter: Router,
    @inject(PRESET_ROUTER_SYMBOL) private readonly presetRouter: Router,
    @inject(RASTER_ROUTER_SYMBOL) private readonly rasterRouter: Router,
    @inject(AUDIT_ROUTER_SYMBOL) private readonly auditRouter: Router,
    @inject(AuditService) private readonly auditService: AuditService
  ) {
    this.serverInstance = express();
  }

  public build(): express.Application {
    this.registerPreRoutesMiddleware();
    this.buildRoutes();
    this.registerPostRoutesMiddleware();

    return this.serverInstance;
  }

  private buildDocsRoutes(): void {
    const openapiRouter = new OpenapiViewerRouter({
      ...this.config.get('openapiConfig'),
      filePathOrSpec: this.config.get('openapiConfig.filePath'),
    });
    openapiRouter.setup();
    this.serverInstance.use(this.config.get('openapiConfig.basePath'), openapiRouter.getRouter());
  }

  private buildRoutes(): void {
    this.serverInstance.use('/tiles', this.tilesRouter);
    this.serverInstance.use('/spatial', this.spatialRouter);
    this.serverInstance.use('/queue', this.queueRouter);
    this.serverInstance.use('/history', this.historyRouter);
    this.serverInstance.use('/presets', this.presetRouter);
    this.serverInstance.use('/config', this.rasterRouter);
    this.serverInstance.use('/audit', this.auditRouter);
    this.buildDocsRoutes();
  }

  private registerPreRoutesMiddleware(): void {
    this.serverInstance.use(collectMetricsExpressMiddleware({ registry: this.metricsRegistry }));
    this.serverInstance.use(httpLogger({ logger: this.logger, ignorePaths: ['/metrics'] }));

    if (this.config.get('server.response.compression.enabled')) {
      this.serverInstance.use(compression(this.config.get('server.response.compression.options') as unknown as compression.CompressionFilter));
    }

    this.serverInstance.use(json(this.config.get('server.request.payload')));

    // Audit logging middleware for mutations and key actions
    const auditService = this.auditService;
    this.serverInstance.use((req, res, next) => {
      const startTime = Date.now();
      const originalEnd = res.end;

      res.end = function (this: express.Response, ...args: any[]) {
        const durationMs = Date.now() - startTime;
        // Intercept and persist non-metrics and non-static requests into persistent audit_logs
        if (!req.path.startsWith('/metrics') && !req.path.startsWith('/docs') && req.path !== '/favicon.ico') {
          void auditService.logEvent({
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs,
            clientIp: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent'),
            requestBody: req.method !== 'GET' && req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
            queryParams: req.query && Object.keys(req.query).length > 0 ? (req.query as Record<string, any>) : undefined,
          });
        }
        return (originalEnd as any).apply(this, args);
      };

      next();
    });

    const ignorePathRegex = new RegExp(`^(${this.config.get('openapiConfig.basePath')}|/spatial/convert).*`, 'i');
    const apiSpecPath = this.config.get('openapiConfig.filePath');
    this.serverInstance.use(OpenApiMiddleware({ apiSpec: apiSpecPath, validateRequests: true, ignorePaths: ignorePathRegex }));
  }

  private registerPostRoutesMiddleware(): void {
    this.serverInstance.use(getErrorHandlerMiddleware());
  }
}
