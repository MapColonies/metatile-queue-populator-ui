import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { HistoryService } from '../models/historyService';

@injectable()
export class HistoryController {
  public constructor(@inject(HistoryService) private readonly historyService: HistoryService) {}

  public getHistory: RequestHandler = (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const history = this.historyService.getHistory(limit);
      return res.status(httpStatus.OK).json(history);
    } catch (error) {
      return next(error);
    }
  };

  public recordHistory: RequestHandler = (req, res, next) => {
    try {
      const { type, parameters, status, responseMessage } = req.body;
      const record = this.historyService.recordSubmission(type, parameters, status, responseMessage);
      return res.status(httpStatus.CREATED).json(record);
    } catch (error) {
      return next(error);
    }
  };
}
