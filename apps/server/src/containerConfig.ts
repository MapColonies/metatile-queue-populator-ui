import { getOtelMixin } from '@map-colonies/tracing-utils';
import { trace } from '@opentelemetry/api';
import { Registry } from 'prom-client';
import type { DependencyContainer } from 'tsyringe/dist/typings/types';
import { jsLogger } from '@map-colonies/js-logger';
import { type InjectionObject, registerDependencies } from '@common/dependencyRegistration';
import { SERVICES, SERVICE_NAME } from '@common/constants';
import { getTracing } from '@common/tracing';
import { TILES_ROUTER_SYMBOL, tilesRouterFactory } from './tiles/routes/tilesRouter';
import { SPATIAL_ROUTER_SYMBOL, spatialRouterFactory } from './spatial/routes/spatialRouter';
import { QUEUE_ROUTER_SYMBOL, queueRouterFactory } from './queue/routes/queueRouter';
import { HISTORY_ROUTER_SYMBOL, historyRouterFactory } from './history/routes/historyRouter';
import { PRESET_ROUTER_SYMBOL, presetRouterFactory } from './presets/routes/presetRouter';
import { RASTER_ROUTER_SYMBOL, rasterRouterFactory } from './raster/routes/rasterRouter';
import { DATA_SOURCE_SYMBOL, createDataSource } from './common/db/dataSource';
import { getConfig } from './common/config';

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}

export const registerExternalValues = async (options?: RegisterOptions): Promise<DependencyContainer> => {
  const configInstance = getConfig();

  const loggerConfig = configInstance.get('telemetry.logger');

  const logger = await jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, mixin: getOtelMixin() });

  const tracer = trace.getTracer(SERVICE_NAME);
  const metricsRegistry = new Registry();
  configInstance.initializeMetrics(metricsRegistry);

  const dataSourceWrapper = await createDataSource(configInstance, logger);

  const dependencies: InjectionObject<unknown>[] = [
    { token: SERVICES.CONFIG, provider: { useValue: configInstance } },
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: SERVICES.TRACER, provider: { useValue: tracer } },
    { token: SERVICES.METRICS, provider: { useValue: metricsRegistry } },
    { token: SERVICES.DATA_SOURCE, provider: { useValue: dataSourceWrapper } },
    { token: TILES_ROUTER_SYMBOL, provider: { useFactory: tilesRouterFactory } },
    { token: SPATIAL_ROUTER_SYMBOL, provider: { useFactory: spatialRouterFactory } },
    { token: QUEUE_ROUTER_SYMBOL, provider: { useFactory: queueRouterFactory } },
    { token: HISTORY_ROUTER_SYMBOL, provider: { useFactory: historyRouterFactory } },
    { token: PRESET_ROUTER_SYMBOL, provider: { useFactory: presetRouterFactory } },
    { token: RASTER_ROUTER_SYMBOL, provider: { useFactory: rasterRouterFactory } },
    {
      token: 'onSignal',
      provider: {
        useValue: async (): Promise<void> => {
          if (dataSourceWrapper.instance?.isInitialized) {
            await dataSourceWrapper.instance.destroy();
          }
          await Promise.all([getTracing().stop()]);
        },
      },
    },
  ];

  return Promise.resolve(registerDependencies(dependencies, options?.override, options?.useChild));
};
