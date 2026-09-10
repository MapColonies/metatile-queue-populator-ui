import type { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import type { Logger } from '@map-colonies/js-logger';
import { SERVICES } from '../../common/constants';
import { DiscoveryService } from '../models/discoveryService';

@injectable()
export class DiscoveryController {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(DiscoveryService) private readonly discoveryService: DiscoveryService
  ) {}

  public getTargets: RequestHandler = async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const forceRefresh = req.query.refresh === 'true';
      const targets = await this.discoveryService.getTargets(forceRefresh);
      res.status(httpStatus.OK).json({ targets });
    } catch (error) {
      this.logger.error({ msg: 'Failed to retrieve targets', err: (error as Error).message });
      next(error);
    }
  };
}
