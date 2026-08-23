import { RequestHandler } from 'express';
import { inject, injectable } from 'tsyringe';
import { StatusCodes } from 'http-status-codes';
import { AuditService } from '../models/auditService';

@injectable()
export class AuditController {
  public constructor(@inject(AuditService) private readonly auditService: AuditService) {}

  public getAuditLogs: RequestHandler = async (req, res, next) => {
    try {
      const { limit, method, statusCode, from, to } = req.query;
      const logs = await this.auditService.getAuditLogs({
        limit: limit ? parseInt(limit as string, 10) : undefined,
        method: method as string | undefined,
        statusCode: statusCode ? parseInt(statusCode as string, 10) : undefined,
        from: from as string | undefined,
        to: to as string | undefined,
      });

      res.status(StatusCodes.OK).json(logs);
    } catch (err) {
      next(err);
    }
  };
}
