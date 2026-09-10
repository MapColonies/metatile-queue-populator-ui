import { Router } from 'express';
import type { FactoryFunction } from 'tsyringe';
import { DiscoveryController } from '../controllers/discoveryController';

export const DISCOVERY_ROUTER_SYMBOL = Symbol('DISCOVERY_ROUTER_SYMBOL');

export const discoveryRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(DiscoveryController);

  router.get('/targets', controller.getTargets);

  return router;
};
