import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { QueueStatusService } from '../models/queueStatusService';

@injectable()
export class QueueController {
  public constructor(@inject(QueueStatusService) private readonly queueStatusService: QueueStatusService) {}

  public getStatus: RequestHandler = async (req, res, next) => {
    try {
      const overview = await this.queueStatusService.getQueueStatus();
      return res.status(httpStatus.OK).json(overview);
    } catch (error) {
      return next(error);
    }
  };
}
