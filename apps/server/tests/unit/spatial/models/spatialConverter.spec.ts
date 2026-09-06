import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialConverter } from '../../../../src/spatial/models/spatialConverter';
import { jsLogger } from '@map-colonies/js-logger';

describe('SpatialConverter', async () => {
  let converter: SpatialConverter;
  const logger = await jsLogger({ enabled: false });

  beforeEach(() => {
    converter = new SpatialConverter(logger);
  });

  describe('parseText with GeoJSON', () => {
    it('should parse FeatureCollection JSON string', () => {
      const geojsonStr = JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Test' },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [34, 31],
                  [35, 31],
                  [35, 32],
                  [34, 32],
                  [34, 31],
                ],
              ],
            },
          },
        ],
      });

      const result = converter.parseText(geojsonStr);
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(1);
    });

    it('should wrap bare Feature into FeatureCollection', () => {
      const featureStr = JSON.stringify({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [34.5, 31.5],
        },
      });

      const result = converter.parseText(featureStr);
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(1);
    });
  });

  describe('parseText with WKT', () => {
    it('should parse WKT Polygon string into FeatureCollection', () => {
      const wktStr = 'POLYGON((34 31, 35 31, 35 32, 34 32, 34 31))';
      const result = converter.parseText(wktStr);

      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(1);
      expect(result.features[0].geometry.type).toBe('Polygon');
    });
  });

  describe('parseText with KML', () => {
    it('should parse KML string into FeatureCollection', () => {
      const kmlStr = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <name>Test Placemark</name>
    <Point>
      <coordinates>34.7818,32.0853,0</coordinates>
    </Point>
  </Placemark>
</kml>`;

      const result = converter.parseText(kmlStr);
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(1);
      expect(result.features[0].geometry.type).toBe('Point');
    });
  });
});
