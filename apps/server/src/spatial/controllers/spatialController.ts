import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SpatialConverter } from '../models/spatialConverter';
import { HttpError } from '../../common/errors';

@injectable()
export class SpatialController {
  public constructor(@inject(SpatialConverter) private readonly spatialConverter: SpatialConverter) {}

  public convertFile: RequestHandler = async (req, res, next) => {
    try {
      if (req.file) {
        const featureCollection = await this.spatialConverter.parseBuffer(req.file.buffer, req.file.originalname);
        return res.status(httpStatus.OK).json(featureCollection);
      }

      if (req.body) {
        if (typeof req.body === 'string') {
          const featureCollection = this.spatialConverter.parseText(req.body);
          return res.status(httpStatus.OK).json(featureCollection);
        }

        if (req.body.text) {
          const featureCollection = this.spatialConverter.parseText(req.body.text, req.body.format);
          return res.status(httpStatus.OK).json(featureCollection);
        }

        if (req.body.type) {
          // Already a GeoJSON object
          return res.status(httpStatus.OK).json(req.body);
        }
      }

      throw new HttpError('No spatial file or payload provided for conversion', httpStatus.BAD_REQUEST);
    } catch (error) {
      return next(error);
    }
  };
}
