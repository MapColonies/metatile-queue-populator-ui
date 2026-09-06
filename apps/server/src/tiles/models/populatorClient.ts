import type { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import httpStatus from 'http-status-codes';
import { SERVICES } from '../../common/constants';
import type { ConfigType } from '../../common/config';
import { HttpError } from '../../common/errors';

export interface PostTilesAreaResponse {
  message: string;
}

export interface PostTilesListResponse {
  message: string;
}

@injectable()
export class PopulatorClient {
  private readonly populatorUrl: string;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.LOGGER) private readonly logger: Logger
  ) {
    this.populatorUrl = (this.config.get as any)('populator.url') ?? 'http://localhost:8081';
  }

  public async postTilesArea(body: unknown, force?: boolean): Promise<PostTilesAreaResponse> {
    const url = new URL('/tiles/area', this.populatorUrl);
    if (force !== undefined) {
      url.searchParams.set('force', String(force));
    }

    this.logger.info({ msg: 'Forwarding /tiles/area request to populator', targetUrl: url.toString() });

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

  public async postTilesList(body: unknown, force?: boolean): Promise<PostTilesListResponse> {
    const url = new URL('/tiles/list', this.populatorUrl);
    if (force !== undefined) {
      url.searchParams.set('force', String(force));
    }

    this.logger.info({ msg: 'Forwarding /tiles/list request to populator', targetUrl: url.toString() });

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
