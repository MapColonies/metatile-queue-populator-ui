import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { PresetService } from '../models/presetService';
import { HttpError } from '../../common/errors';

@injectable()
export class PresetController {
  public constructor(@inject(PresetService) private readonly presetService: PresetService) {}

  public getPresets: RequestHandler = async (_req, res, next) => {
    try {
      const presets = await this.presetService.getPresets();
      return res.status(httpStatus.OK).json(presets);
    } catch (error) {
      return next(error);
    }
  };

  public createPreset: RequestHandler = async (req, res, next) => {
    try {
      const { name, category, continent, subregion, description, minZoom, maxZoom, priority, area } = req.body;
      if (!name || minZoom === undefined || maxZoom === undefined || !area) {
        throw new HttpError('Missing required preset fields (name, minZoom, maxZoom, area)', httpStatus.BAD_REQUEST);
      }

      const preset = await this.presetService.createPreset({
        name,
        category,
        continent,
        subregion,
        description,
        minZoom,
        maxZoom,
        priority,
        area,
      });

      return res.status(httpStatus.CREATED).json(preset);
    } catch (error) {
      return next(error);
    }
  };

  public deletePreset: RequestHandler = async (req, res, next) => {
    try {
      const { id } = req.params;
      const success = await this.presetService.deletePreset(String(id));
      if (!success) {
        throw new HttpError(`Preset with ID ${id} not found`, httpStatus.NOT_FOUND);
      }
      return res.status(httpStatus.OK).json({ message: 'Preset deleted successfully' });
    } catch (error) {
      return next(error);
    }
  };
}
