import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PopulatorClient } from '../../../../src/tiles/models/populatorClient';
import { jsLogger } from '@map-colonies/js-logger';

describe('PopulatorClient', async () => {
  let populatorClient: PopulatorClient;
  const configMock = {
    get: vi.fn().mockReturnValue('http://localhost:8081'),
  };
  const logger = await jsLogger({ enabled: false });

  beforeEach(() => {
    vi.restoreAllMocks();
    populatorClient = new PopulatorClient(configMock as any, logger);
  });

  describe('postTilesArea', () => {
    it('should successfully post area request to populator', async () => {
      const mockResponse = { message: 'Area request successfully added to queue' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const body = { minZoom: 0, maxZoom: 10, priority: 5, area: [34, 31, 35, 32] };
      const response = await populatorClient.postTilesArea(body, true);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8081/tiles/area?force=true',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      );
      expect(response).toEqual(mockResponse);
    });

    it('should throw HttpError when populator returns error status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({ message: 'Invalid BBOX' }),
      });

      const body = { minZoom: 0, maxZoom: 10, area: [34, 31, 35, 32] };
      await expect(populatorClient.postTilesArea(body)).rejects.toThrow('Invalid BBOX');
    });
  });

  describe('postTilesList', () => {
    it('should successfully post tile list to populator', async () => {
      const mockResponse = { message: 'Tile list successfully queued' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const body = [{ z: 10, x: 500, y: 300, metatile: 1 }];
      const response = await populatorClient.postTilesList(body, false);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8081/tiles/list?force=false',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
      expect(response).toEqual(mockResponse);
    });
  });
});
