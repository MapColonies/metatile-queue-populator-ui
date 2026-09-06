import { Router } from 'express';
import type { FactoryFunction } from 'tsyringe';
import { QueueController } from '../controllers/queueController';

export const QUEUE_ROUTER_SYMBOL = Symbol('queueRouterFactory');

export const queueRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(QueueController);

  router.get('/status', controller.getStatus);
  router.get('/metrics', controller.getStatus);

  return router;
};
