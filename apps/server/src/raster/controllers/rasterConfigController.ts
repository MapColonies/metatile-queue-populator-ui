import { RequestHandler } from 'express';
import { inject, injectable } from 'tsyringe';
import type { Logger } from '@map-colonies/js-logger';
import { SERVICES } from '@common/constants';
import type { ConfigType } from '@common/config';

interface DefaultMapConfig {
  useOsm?: boolean;
  productId?: string;
  productType?: string;
}

interface RasterConfigResponse {
  cswUrl: string;
  token?: string;
  defaultMap?: DefaultMapConfig;
}

@injectable()
export class RasterConfigController {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: ConfigType
  ) {}

  public getConfig: RequestHandler<undefined, RasterConfigResponse> = (_req, res, next) => {
    try {
      const cswUrl = (this.config.get as any)('raster.cswUrl');
      let token: string | undefined;
      try {
        token = (this.config.get as any)('raster.token');
      } catch {
        token = undefined;
      }

      let defaultMap: DefaultMapConfig | undefined;
      try {
        defaultMap = (this.config.get as any)('raster.defaultMap');
      } catch {
        defaultMap = undefined;
      }

      return res.status(200).json({
        cswUrl,
        token: token || undefined,
        defaultMap,
      });
    } catch (err) {
      this.logger.error({ msg: 'Failed to retrieve raster configuration', err });
      return next(err);
    }
  };
}
