import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryService } from '../../../../src/history/models/historyService';
import { jsLogger } from '@map-colonies/js-logger';

describe('HistoryService', async () => {
  let historyService: HistoryService;
  const logger = await jsLogger({ enabled: false });

  beforeEach(() => {
    historyService = new HistoryService(logger);
  });

  it('should record an area submission and retrieve it in getHistory', async () => {
    const params = {
      minZoom: 2,
      maxZoom: 6,
      area: [34, 31, 35, 32],
    };

    const record = await historyService.recordSubmission('area', params, 'SUCCESS', 'Job submitted');

    expect(record.id).toBeDefined();
    expect(record.type).toBe('area');
    expect(record.summary).toContain('Area Job (Z2-Z6');

    const history = await historyService.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(record.id);
  });

  it('should filter history by type and status', async () => {
    await historyService.recordSubmission('area', { minZoom: 0, maxZoom: 1 }, 'SUCCESS');
    await historyService.recordSubmission('list', { tiles: [] }, 'FAILED');

    const areaHistory = await historyService.getHistory({ type: 'area' });
    expect(areaHistory).toHaveLength(1);
    expect(areaHistory[0].type).toBe('area');

    const failedHistory = await historyService.getHistory({ status: 'FAILED' });
    expect(failedHistory).toHaveLength(1);
    expect(failedHistory[0].status).toBe('FAILED');
  });

  it('should clear history successfully', async () => {
    await historyService.recordSubmission('area', { minZoom: 0, maxZoom: 1 }, 'SUCCESS');
    expect((await historyService.getHistory()).length).toBeGreaterThan(0);

    await historyService.clearHistory();
    expect(await historyService.getHistory()).toHaveLength(0);
  });
});
