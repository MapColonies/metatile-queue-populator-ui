import { Router } from 'express';
import type { FactoryFunction } from 'tsyringe';
import { AuditController } from '../controllers/auditController';

export const AUDIT_ROUTER_SYMBOL = Symbol('AUDIT_ROUTER_SYMBOL');

export const auditRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(AuditController);

  router.get('/', controller.getAuditLogs);

  return router;
};
