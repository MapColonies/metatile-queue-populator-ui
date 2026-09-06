import { describe, it, expect, beforeEach } from 'vitest';
import { TileEstimationService } from '../../../../src/tiles/models/estimationService';
import { jsLogger } from '@map-colonies/js-logger';

describe('TileEstimationService', async () => {
  let estimationService: TileEstimationService;
  const configMock = {
    has: () => true,
    get: () => 8,
  };
  const logger = await jsLogger({ enabled: false });

  beforeEach(() => {
    estimationService = new TileEstimationService(configMock as any, logger);
  });

  describe('estimateTiles with BBOX', () => {
    it('should accurately calculate tile and metatile counts for a known bounding box', async () => {
      const request = {
        minZoom: 0,
        maxZoom: 2,
        area: [34.0, 31.0, 35.0, 32.0] as [number, number, number, number],
        metatile: 8,
      };

      const result = await estimationService.estimateTiles(request);

      expect(result.metatileSize).toBe(8);
      expect(result.breakdown).toHaveLength(3);
      expect(result.breakdown[0].zoom).toBe(0);
      expect(result.breakdown[0].metatiles).toBeGreaterThan(0);
      expect(result.breakdown[0].tiles).toBe(result.breakdown[0].metatiles * 64);
      expect(result.totalMetatiles).toBeGreaterThan(0);
      expect(result.totalTiles).toBe(result.totalMetatiles * 64);
    });

    it('should correctly scale tiles when zoom increases', async () => {
      const request = {
        minZoom: 5,
        maxZoom: 7,
        area: [34.7, 32.0, 34.9, 32.2] as [number, number, number, number],
        metatile: 8,
      };

      const result = await estimationService.estimateTiles(request);
      expect(result.breakdown).toHaveLength(3);
      expect(result.breakdown[2].tiles).toBeGreaterThanOrEqual(result.breakdown[0].tiles);
    });
  });

  describe('estimateTiles with GeoJSON Polygon', () => {
    it('should calculate estimates for a GeoJSON feature', async () => {
      const polygonFeature = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [34.7, 32.0],
              [34.9, 32.0],
              [34.9, 32.2],
              [34.7, 32.2],
              [34.7, 32.0],
            ],
          ],
        },
      };

      const request = {
        minZoom: 4,
        maxZoom: 5,
        area: polygonFeature,
        metatile: 8,
      };

      const result = await estimationService.estimateTiles(request);
      expect(result.totalTiles).toBeGreaterThan(0);
      expect(result.breakdown).toHaveLength(2);
    });
  });
});
