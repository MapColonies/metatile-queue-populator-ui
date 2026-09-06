import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import supertest from 'supertest';
import type { Application } from 'express';
import { getApp } from '../../../src/app';
import { initConfig } from '../../../src/common/config';
import { PopulatorClient } from '../../../src/tiles/models/populatorClient';

describe('Tiles Routes Integration', () => {
  let app: Application;
  let populatorClientMock: {
    postTilesArea: ReturnType<typeof vi.fn>;
    postTilesList: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    await initConfig(true);
  });

  beforeEach(async () => {
    populatorClientMock = {
      postTilesArea: vi.fn().mockResolvedValue({ message: 'Area request processed' }),
      postTilesList: vi.fn().mockResolvedValue({ message: 'Tile list processed' }),
    };

    const [appInstance] = await getApp({
      override: [
        {
          token: PopulatorClient,
          provider: { useValue: populatorClientMock },
        },
      ],
      useChild: true,
    });

    app = appInstance;
  });

  describe('POST /tiles/area', () => {
    it('should return 200 OK for valid BBox area request', async () => {
      const body = {
        minZoom: 0,
        maxZoom: 5,
        priority: 1,
        area: [34.0, 31.0, 35.0, 32.0],
      };

      const response = await supertest(app).post('/tiles/area?force=true').send(body).set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Area request processed' });
      expect(populatorClientMock.postTilesArea).toHaveBeenCalledWith(body, true);
    });

    it('should return 400 Bad Request for invalid zoom range', async () => {
      const invalidBody = {
        minZoom: 20,
        maxZoom: 5,
        area: [34.0, 31.0, 35.0, 32.0],
      };

      const response = await supertest(app).post('/tiles/area').send(invalidBody).set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /tiles/list', () => {
    it('should return 200 OK for valid tile list', async () => {
      const body = [{ z: 5, x: 10, y: 12, metatile: 1 }];

      const response = await supertest(app).post('/tiles/list').send(body).set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Tile list processed' });
      expect(populatorClientMock.postTilesList).toHaveBeenCalledWith(body, undefined);
    });

    it('should return 400 Bad Request for empty tile list', async () => {
      const response = await supertest(app).post('/tiles/list').send([]).set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /tiles/estimate', () => {
    it('should return 200 OK with accurate breakdown for valid bbox area', async () => {
      const body = {
        minZoom: 0,
        maxZoom: 3,
        area: [34.0, 31.0, 35.0, 32.0],
        metatile: 8,
      };

      const response = await supertest(app).post('/tiles/estimate').send(body).set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalMetatiles');
      expect(response.body).toHaveProperty('totalTiles');
      expect(response.body).toHaveProperty('breakdown');
      expect(response.body.breakdown).toHaveLength(4);
    });
  });
});
