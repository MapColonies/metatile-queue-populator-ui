import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { PopulatorClient } from '../models/populatorClient';
import { TileEstimationService, EstimationResult } from '../models/estimationService';

type PostTilesAreaHandler = RequestHandler<undefined, { message: string }, unknown, { force?: string }>;
type PostTilesListHandler = RequestHandler<undefined, { message: string }, unknown, { force?: string }>;
type PostTilesEstimateHandler = RequestHandler<undefined, EstimationResult, any>;

@injectable()
export class TilesController {
  public constructor(
    @inject(PopulatorClient) private readonly populatorClient: PopulatorClient,
    @inject(TileEstimationService) private readonly estimationService: TileEstimationService
  ) {}

  public postTilesArea: PostTilesAreaHandler = async (req, res, next) => {
    try {
      const forceQuery = req.query.force as unknown;
      const force = forceQuery === true || forceQuery === 'true' ? true : forceQuery === false || forceQuery === 'false' ? false : undefined;
      const result = await this.populatorClient.postTilesArea(req.body, force);
      return res.status(httpStatus.OK).json(result);
    } catch (error) {
      return next(error);
    }
  };

  public postTilesList: PostTilesListHandler = async (req, res, next) => {
    try {
      const forceQuery = req.query.force as unknown;
      const force = forceQuery === true || forceQuery === 'true' ? true : forceQuery === false || forceQuery === 'false' ? false : undefined;
      const result = await this.populatorClient.postTilesList(req.body, force);
      return res.status(httpStatus.OK).json(result);
    } catch (error) {
      return next(error);
    }
  };

  public postEstimateTiles: PostTilesEstimateHandler = async (req, res, next) => {
    try {
      const result = await this.estimationService.estimateTiles(req.body);
      return res.status(httpStatus.OK).json(result);
    } catch (error) {
      return next(error);
    }
  };
}
