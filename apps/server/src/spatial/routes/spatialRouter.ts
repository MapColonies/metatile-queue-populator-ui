import { Router } from 'express';
import multer from 'multer';
import { FactoryFunction } from 'tsyringe';
import { SpatialController } from '../controllers/spatialController';

export const SPATIAL_ROUTER_SYMBOL = Symbol('spatialRouterFactory');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export const spatialRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(SpatialController);

  router.post('/convert', upload.single('file'), controller.convertFile);

  return router;
};
