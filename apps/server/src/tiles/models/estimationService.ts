import type { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { BoundingBox, lonLatZoomToTile, tileToBoundingBox, Tile } from '@map-colonies/tile-calc';
import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson';
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

const MAX_CALCULATION_TIME_MS = 25000; // 25s timeout limit for estimation loop

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

  public estimateTiles(request: EstimateRequest): EstimationResult {
    const startTime = Date.now();
    const { minZoom, maxZoom, area } = request;
    const metatile = request.metatile ?? this.defaultMetatile;

    if (minZoom < 0 || maxZoom > 18 || minZoom > maxZoom) {
      throw new HttpError('Invalid zoom level range (minZoom and maxZoom must be between 0 and 18)', httpStatus.BAD_REQUEST);
    }

    const { boundingBox: geomBbox, targetPolygons, isGeojson } = this.extractBboxAndPolygons(area);

    const breakdown: ZoomEstimation[] = [];
    let totalMetatiles = 0;

    for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
      if (Date.now() - startTime > MAX_CALCULATION_TIME_MS) {
        this.logger.warn({ msg: 'Tile estimation exceeded 25s execution timeout limit', minZoom, maxZoom });
        throw new HttpError('Calculation timed out after 30 seconds due to extremely large spatial query area and high zoom levels. Please reduce maxZoom or use BBOX.', httpStatus.REQUEST_TIMEOUT);
      }

      const upperLeft = lonLatZoomToTile({ lon: geomBbox.west, lat: geomBbox.north }, zoom, metatile);
      const lowerRight = lonLatZoomToTile({ lon: geomBbox.east, lat: geomBbox.south }, zoom, metatile);

      const totalBboxCols = Math.max(0, lowerRight.x - upperLeft.x + 1);
      const totalBboxRows = Math.max(0, lowerRight.y - upperLeft.y + 1);
      const bboxCandidateCount = totalBboxCols * totalBboxRows;

      let zoomMetatiles = 0;

      if (!isGeojson || targetPolygons.length === 0) {
        // Pure BBOX formula
        zoomMetatiles = bboxCandidateCount;
      } else {
        // Fast pre-filter against each polygon's bbox
        const polygonWithBboxes = targetPolygons.map((poly) => ({
          poly,
          bbox: turf.bbox(poly), // [minX, minY, maxX, maxY]
        }));

        for (let y = upperLeft.y; y <= lowerRight.y; y++) {
          // Timeout check inside heavy loops
          if (Date.now() - startTime > MAX_CALCULATION_TIME_MS) {
            this.logger.warn({ msg: 'Tile estimation exceeded 25s execution timeout limit in zoom loop', zoom, minZoom, maxZoom });
            throw new HttpError('Calculation timed out after 30 seconds due to extremely large spatial query area. Please refine zoom range or select a smaller area.', httpStatus.REQUEST_TIMEOUT);
          }

          for (let x = upperLeft.x; x <= lowerRight.x; x++) {
            const candidateTile: Tile = { x, y, z: zoom, metatile };
            const tileBbox = tileToBoundingBox(candidateTile);

            // Bounding box overlap filter first before expensive geometry intersection
            let intersects = false;
            for (const { poly, bbox } of polygonWithBboxes) {
              if (
                tileBbox.east < bbox[0] ||
                tileBbox.west > bbox[2] ||
                tileBbox.north < bbox[1] ||
                tileBbox.south > bbox[3]
              ) {
                continue; // No AABB overlap
              }

              const tilePoly = this.boundingBoxToPolygonFeature(tileBbox);
              if (turf.booleanIntersects(tilePoly as Feature<Polygon>, poly)) {
                intersects = true;
                break;
              }
            }

            if (intersects) {
              zoomMetatiles++;
            }
          }
        }
      }

      const standardTilesPerMetatile = metatile * metatile;
      const zoomTiles = zoomMetatiles * standardTilesPerMetatile;

      breakdown.push({
        zoom,
        metatiles: zoomMetatiles,
        tiles: zoomTiles,
      });

      totalMetatiles += zoomMetatiles;
    }

    const totalTiles = totalMetatiles * (metatile * metatile);

    return {
      totalMetatiles,
      totalTiles,
      metatileSize: metatile,
      breakdown,
    };
  }

  private extractBboxAndPolygons(area: EstimateRequest['area']): {
    boundingBox: BoundingBox;
    targetPolygons: Feature<Polygon | MultiPolygon>[];
    isGeojson: boolean;
  } {
    if (Array.isArray(area) && area.length === 4) {
      return {
        boundingBox: { west: area[0], south: area[1], east: area[2], north: area[3] },
        targetPolygons: [],
        isGeojson: false,
      };
    }

    const geojsonObj = area as any;
    const computedBbox = turf.bbox(geojsonObj);
    const boundingBox = {
      west: computedBbox[0],
      south: computedBbox[1],
      east: computedBbox[2],
      north: computedBbox[3],
    };

    const targetPolygons: Feature<Polygon | MultiPolygon>[] = [];

    if (geojsonObj.type === 'FeatureCollection') {
      const fc = geojsonObj as FeatureCollection;
      if (Array.isArray(fc.features)) {
        for (const feat of fc.features) {
          if (feat.geometry?.type === 'Polygon' || feat.geometry?.type === 'MultiPolygon') {
            targetPolygons.push(feat as Feature<Polygon | MultiPolygon>);
          }
        }
      }
    } else if (geojsonObj.type === 'Feature') {
      if (geojsonObj.geometry?.type === 'Polygon' || geojsonObj.geometry?.type === 'MultiPolygon') {
        targetPolygons.push(geojsonObj as Feature<Polygon | MultiPolygon>);
      }
    } else if (geojsonObj.type === 'Polygon' || geojsonObj.type === 'MultiPolygon') {
      targetPolygons.push({
        type: 'Feature',
        properties: {},
        geometry: geojsonObj,
      });
    }

    return {
      boundingBox,
      targetPolygons,
      isGeojson: targetPolygons.length > 0,
    };
  }

  private boundingBoxToPolygonFeature(bbox: BoundingBox): Feature<Polygon> {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [bbox.west, bbox.south],
            [bbox.east, bbox.south],
            [bbox.east, bbox.north],
            [bbox.west, bbox.north],
            [bbox.west, bbox.south],
          ],
        ],
      },
    };
  }
}
