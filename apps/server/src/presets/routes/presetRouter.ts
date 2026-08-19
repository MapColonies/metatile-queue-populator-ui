import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { PresetController } from '../controllers/presetController';

export const PRESET_ROUTER_SYMBOL = Symbol('presetRouterFactory');

export const presetRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(PresetController);

  router.get('/', controller.getPresets);
  router.post('/', controller.createPreset);
  router.delete('/:id', controller.deletePreset);

  return router;
};
