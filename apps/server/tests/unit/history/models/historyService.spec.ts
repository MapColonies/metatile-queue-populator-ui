import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryService } from '../../../../src/history/models/historyService';
import { jsLogger } from '@map-colonies/js-logger';

describe('HistoryService', async () => {
  let historyService: HistoryService;
  const logger = await jsLogger({ enabled: false });

  beforeEach(() => {
    historyService = new HistoryService(logger);
  });

  it('should record an area submission and retrieve it in getHistory', () => {
    const params = {
      minZoom: 2,
      maxZoom: 6,
      area: [34, 31, 35, 32],
    };

    const record = historyService.recordSubmission('area', params, 'SUCCESS', 'Job submitted');

    expect(record.id).toBeDefined();
    expect(record.type).toBe('area');
    expect(record.summary).toContain('Area Job (Z2-Z6');

    const history = historyService.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(record.id);
  });

  it('should record a tile list submission', () => {
    const params = {
      tiles: [{ z: 10, x: 500, y: 300, metatile: 8 }],
    };

    const record = historyService.recordSubmission('list', params, 'SUCCESS');
    expect(record.summary).toBe('Tile List Job (1 metatiles)');
  });
});
