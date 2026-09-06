import { Router } from 'express';
import type { FactoryFunction } from 'tsyringe';
import { HistoryController } from '../controllers/historyController';

export const HISTORY_ROUTER_SYMBOL = Symbol('historyRouterFactory');

export const historyRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(HistoryController);

  router.get('/', controller.getHistory);
  router.post('/', controller.recordHistory);

  return router;
};
