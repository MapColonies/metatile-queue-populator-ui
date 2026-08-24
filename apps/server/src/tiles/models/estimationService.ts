import type { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { Worker } from 'worker_threads';
import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Feature, FeatureCollection } from 'geojson';
import { SERVICES } from '../../common/constants';
import type { ConfigType } from '../../common/config';
import { HttpError } from '../../common/errors';
import httpStatus from 'http-status-codes';

export interface ZoomEstimation {
  zoom: number;
  metatiles: number;
  tiles: number;
}

export interface EstimationResult {
  totalMetatiles: number;
  totalTiles: number;
  metatileSize: number;
  breakdown: ZoomEstimation[];
}

export interface EstimateRequest {
  area: [number, number, number, number] | Feature | FeatureCollection | Record<string, any>;
  minZoom: number;
  maxZoom: number;
  metatile?: number;
}

const MAX_CALCULATION_TIME_MS = 30000; // 30s timeout limit

@injectable()
export class TileEstimationService {
  private readonly defaultMetatile: number;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.LOGGER) private readonly logger: Logger
  ) {
    try {
      this.defaultMetatile = (this.config.get as any)('app.metatileSize') ?? 8;
    } catch {
      this.defaultMetatile = 8;
    }
  }

  public async estimateTiles(request: EstimateRequest): Promise<EstimationResult> {
    const { minZoom, maxZoom, area } = request;
    const metatile = request.metatile ?? this.defaultMetatile;

    if (minZoom < 0 || maxZoom > 18 || minZoom > maxZoom) {
      throw new HttpError('Invalid zoom level range (minZoom and maxZoom must be between 0 and 18)', httpStatus.BAD_REQUEST);
    }

    const workerPath = this.resolveWorkerPath();

    return new Promise<EstimationResult>((resolvePromise, rejectPromise) => {
      const worker = new Worker(workerPath, {
        workerData: {
          area,
          minZoom,
          maxZoom,
          metatile,
          timeoutMs: MAX_CALCULATION_TIME_MS,
        },
      });

      const killTimeout = setTimeout(() => {
        worker.terminate().catch(() => null);
        this.logger.warn({ msg: 'Terminated worker thread due to 30s timeout', minZoom, maxZoom });
        rejectPromise(
          new HttpError(
            'Calculation timed out after 30 seconds due to extremely large spatial query area. Please refine zoom range or select a smaller area.',
            httpStatus.REQUEST_TIMEOUT
          )
        );
      }, MAX_CALCULATION_TIME_MS);

      worker.on('message', (msg: any) => {
        clearTimeout(killTimeout);
        if (msg.success) {
          resolvePromise(msg.result);
        } else if (msg.isTimeout) {
          rejectPromise(
            new HttpError(
              'Calculation timed out after 30 seconds due to extremely large spatial query area. Please refine zoom range or select a smaller area.',
              httpStatus.REQUEST_TIMEOUT
            )
          );
        } else {
          rejectPromise(new HttpError(msg.error || 'Tile estimation failed', httpStatus.INTERNAL_SERVER_ERROR));
        }
      });

      worker.on('error', (err: any) => {
        clearTimeout(killTimeout);
        this.logger.error({ msg: 'Worker thread error during tile estimation', err: err.message });
        rejectPromise(new HttpError('Internal error during tile estimation', httpStatus.INTERNAL_SERVER_ERROR));
      });

      worker.on('exit', (code) => {
        clearTimeout(killTimeout);
        if (code !== 0) {
          rejectPromise(new HttpError(`Worker thread stopped with exit code ${code}`, httpStatus.INTERNAL_SERVER_ERROR));
        }
      });
    });
  }

  private resolveWorkerPath(): string {
    const candidates = [
      resolve(__dirname, './estimationWorker.js'),
      resolve(__dirname, './estimationWorker.ts'),
      resolve(process.cwd(), 'dist/tiles/models/estimationWorker.js'),
      resolve(process.cwd(), 'src/tiles/models/estimationWorker.ts'),
    ];

    for (const p of candidates) {
      if (existsSync(p)) {
        return p;
      }
    }

    return resolve(__dirname, './estimationWorker.js');
  }
}
