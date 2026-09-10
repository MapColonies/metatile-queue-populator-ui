import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { QueueStatusService } from '../models/queueStatusService';

@injectable()
export class QueueController {
  public constructor(@inject(QueueStatusService) private readonly queueStatusService: QueueStatusService) {}

  public getStatus: RequestHandler = async (req, res, next) => {
    try {
      const target = (req.query.target as string | undefined) || (req.headers['x-target-id'] as string | undefined);
      const overview = await this.queueStatusService.getQueueStatus(target);
      return res.status(httpStatus.OK).json(overview);
    } catch (error) {
      return next(error);
    }
  };
}
