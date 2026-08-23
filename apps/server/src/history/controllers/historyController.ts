import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { HistoryService } from '../models/historyService';

@injectable()
export class HistoryController {
  public constructor(@inject(HistoryService) private readonly historyService: HistoryService) {}

  public getHistory: RequestHandler = async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const type = req.query.type as 'area' | 'list' | undefined;
      const status = req.query.status as 'SUCCESS' | 'FAILED' | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;

      const history = await this.historyService.getHistory({ limit, type, status, from, to });
      return res.status(httpStatus.OK).json(history);
    } catch (error) {
      return next(error);
    }
  };

  public recordHistory: RequestHandler = async (req, res, next) => {
    try {
      const { type, parameters, status, responseMessage } = req.body;
      const record = await this.historyService.recordSubmission(type, parameters, status, responseMessage);
      return res.status(httpStatus.CREATED).json(record);
    } catch (error) {
      return next(error);
    }
  };
}
