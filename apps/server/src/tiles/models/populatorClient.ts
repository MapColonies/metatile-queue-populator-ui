import type { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import httpStatus from 'http-status-codes';
import { SERVICES } from '../../common/constants';
import type { ConfigType } from '../../common/config';
import { HttpError } from '../../common/errors';
import { DiscoveryService } from '../../discovery/models/discoveryService';

export interface PostTilesAreaResponse {
  message: string;
}

export interface PostTilesListResponse {
  message: string;
}

export function sanitizeArea(area: unknown): unknown {
  if (!area || typeof area !== 'object') {
    return area;
  }

  // If bounding box array [minx, miny, maxx, maxy], keep as-is
  if (Array.isArray(area)) {
    return area;
  }

  const areaObj = area as Record<string, any>;

  // If FeatureCollection
  if (areaObj.type === 'FeatureCollection' && Array.isArray(areaObj.features)) {
    return {
      ...areaObj,
      features: areaObj.features.map((f: any) => {
        if (f && typeof f === 'object' && f.type === 'Feature') {
          return {
            ...f,
            properties: f.properties && typeof f.properties === 'object' ? f.properties : {},
          };
        }
        return f;
      }),
    };
  }

  // If Feature
  if (areaObj.type === 'Feature') {
    return {
      ...areaObj,
      properties: areaObj.properties && typeof areaObj.properties === 'object' ? areaObj.properties : {},
    };
  }

  // If raw Geometry (e.g. Polygon, MultiPolygon)
  if (areaObj.coordinates && typeof areaObj.type === 'string') {
    return {
      type: 'Feature',
      properties: {},
      geometry: areaObj,
    };
  }

  return area;
}

export function sanitizeTilesAreaBody(body: unknown): unknown {
  if (Array.isArray(body)) {
    return body.map((item) => sanitizeTilesAreaBody(item));
  }

  if (body && typeof body === 'object') {
    const obj = body as Record<string, any>;
    if ('area' in obj) {
      return {
        ...obj,
        area: sanitizeArea(obj.area),
      };
    }
  }

  return body;
}

@injectable()
export class PopulatorClient {
  private readonly populatorUrl: string;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(DiscoveryService) private readonly discoveryService?: DiscoveryService
  ) {
    this.populatorUrl = (this.config.get as any)('populator.url') ?? 'http://localhost:8081';
  }

  public async getBaseUrl(targetId?: string): Promise<string> {
    if (this.discoveryService) {
      const target = await this.discoveryService.getTarget(targetId);
      if (target?.url) {
        return target.url;
      }
    }
    return this.populatorUrl;
  }

  public async postTilesArea(body: unknown, force?: boolean, targetId?: string): Promise<PostTilesAreaResponse> {
    const baseUrl = await this.getBaseUrl(targetId);
    const url = new URL('/tiles/area', baseUrl);
    if (force !== undefined) {
      url.searchParams.set('force', String(force));
    }

    const sanitizedBody = sanitizeTilesAreaBody(body);

    this.logger.info({ msg: 'Forwarding /tiles/area request to populator', targetUrl: url.toString(), targetId });

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedBody),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({ message: response.statusText }))) as { message?: string };
        this.logger.error({ msg: 'Populator responded with error on /tiles/area', status: response.status, errorBody });
        throw new HttpError(errorBody.message ?? 'Error from upstream populator', response.status);
      }

      return (await response.json()) as PostTilesAreaResponse;
    } catch (err) {
      if (err instanceof HttpError) {
        throw err;
      }
      const message = (err as Error).message || 'Failed to connect to upstream populator';
      this.logger.error({ msg: 'Error connecting to populator service', err: message });
      throw new HttpError(message, httpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  public async postTilesList(body: unknown, force?: boolean, targetId?: string): Promise<PostTilesListResponse> {
    const baseUrl = await this.getBaseUrl(targetId);
    const url = new URL('/tiles/list', baseUrl);
    if (force !== undefined) {
      url.searchParams.set('force', String(force));
    }

    this.logger.info({ msg: 'Forwarding /tiles/list request to populator', targetUrl: url.toString(), targetId });

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({ message: response.statusText }))) as { message?: string };
        this.logger.error({ msg: 'Populator responded with error on /tiles/list', status: response.status, errorBody });
        throw new HttpError(errorBody.message ?? 'Error from upstream populator', response.status);
      }

      return (await response.json()) as PostTilesListResponse;
    } catch (err) {
      if (err instanceof HttpError) {
        throw err;
      }
      const message = (err as Error).message || 'Failed to connect to upstream populator';
      this.logger.error({ msg: 'Error connecting to populator service', err: message });
      throw new HttpError(message, httpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
