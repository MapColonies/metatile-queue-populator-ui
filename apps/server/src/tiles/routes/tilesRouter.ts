import { Router } from 'express';
import type { FactoryFunction } from 'tsyringe';
import { TilesController } from '../controllers/tilesController';

export const TILES_ROUTER_SYMBOL = Symbol('tilesRouterFactory');

export const tilesRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(TilesController);

  router.post('/area', controller.postTilesArea);
  router.post('/list', controller.postTilesList);
  router.post('/estimate', controller.postEstimateTiles);

  return router;
};
