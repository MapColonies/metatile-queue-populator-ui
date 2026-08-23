import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { RasterConfigController } from '../controllers/rasterConfigController';

export const RASTER_ROUTER_SYMBOL = Symbol('RasterRouter');

export const rasterRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(RasterConfigController);

  router.get('/raster', controller.getConfig);

  return router;
};
