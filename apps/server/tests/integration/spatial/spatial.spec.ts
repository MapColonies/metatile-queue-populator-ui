import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import type { Application } from 'express';
import { getApp } from '../../../src/app';
import { initConfig } from '../../../src/common/config';

describe('Spatial Routes Integration', () => {
  let app: Application;

  beforeAll(async () => {
    await initConfig(true);
  });

  beforeEach(async () => {
    const [appInstance] = await getApp({ useChild: true });
    app = appInstance;
  });

  describe('POST /spatial/convert', () => {
    it('should convert JSON text payload containing WKT string', async () => {
      const body = {
        text: 'POLYGON((34 31, 35 31, 35 32, 34 32, 34 31))',
        format: 'wkt',
      };

      const response = await supertest(app).post('/spatial/convert').send(body).set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('FeatureCollection');
      expect(response.body.features).toHaveLength(1);
      expect(response.body.features[0].geometry.type).toBe('Polygon');
    });

    it('should convert uploaded GeoJSON file through multipart upload', async () => {
      const geojsonContent = JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: [34.78, 32.08],
            },
          },
        ],
      });

      const response = await supertest(app).post('/spatial/convert').attach('file', Buffer.from(geojsonContent), 'aoi.geojson');

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('FeatureCollection');
      expect(response.body.features).toHaveLength(1);
    });

    it('should return 400 Bad Request when no payload or file is attached', async () => {
      const response = await supertest(app).post('/spatial/convert').send({}).set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });
  });
});
