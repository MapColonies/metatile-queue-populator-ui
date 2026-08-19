import type { Logger } from '@map-colonies/js-logger';
import { inject, injectable, singleton } from 'tsyringe';
import { randomUUID } from 'crypto';
import { SERVICES } from '../../common/constants';

export interface HistoryRecord {
  id: string;
  type: 'area' | 'list';
  timestamp: string;
  parameters: Record<string, any>;
  summary: string;
  status: 'SUCCESS' | 'FAILED';
  responseMessage?: string;
}

@singleton()
@injectable()
export class HistoryService {
  private records: HistoryRecord[] = [];
  private readonly maxRecords = 200;

  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger) {}

  public recordSubmission(
    type: 'area' | 'list',
    parameters: Record<string, any>,
    status: 'SUCCESS' | 'FAILED',
    responseMessage?: string
  ): HistoryRecord {
    let summary = '';
    if (type === 'area') {
      const minZ = parameters.minZoom ?? 0;
      const maxZ = parameters.maxZoom ?? 10;
      const areaType = Array.isArray(parameters.area) ? 'BBOX' : 'GeoJSON Polygon';
      summary = `Area Job (Z${minZ}-Z${maxZ}, ${areaType})`;
    } else {
      const count = Array.isArray(parameters.tiles) ? parameters.tiles.length : 0;
      summary = `Tile List Job (${count} metatiles)`;
    }

    const record: HistoryRecord = {
      id: randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      parameters,
      summary,
      status,
      responseMessage,
    };

    this.records.unshift(record);
    if (this.records.length > this.maxRecords) {
      this.records.pop();
    }

    this.logger.info({ msg: 'Recorded job history', recordId: record.id, summary });
    return record;
  }

  public getHistory(limit = 50): HistoryRecord[] {
    return this.records.slice(0, limit);
  }

  public clearHistory(): void {
    this.records = [];
  }
}
