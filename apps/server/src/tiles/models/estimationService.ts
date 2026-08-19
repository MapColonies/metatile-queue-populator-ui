import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { BoundingBox, lonLatZoomToTile, tileToBoundingBox, Tile } from '@map-colonies/tile-calc';
import * as turf from '@turf/turf';
import { Feature, Polygon, MultiPolygon } from 'geojson';
import { SERVICES } from '../../common/constants';
import { ConfigType } from '../../common/config';

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
  area: [number, number, number, number] | Feature | Record<string, any>;
  minZoom: number;
  maxZoom: number;
  metatile?: number;
}

@injectable()
export class TileEstimationService {
  private readonly defaultMetatile: number;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.LOGGER) private readonly logger: Logger
  ) {
    try {
      this.defaultMetatile = this.config.get<number>('app.metatileSize');
    } catch {
      this.defaultMetatile = 8;
    }
  }

  public estimateTiles(request: EstimateRequest): EstimationResult {
    const { minZoom, maxZoom, area } = request;
    const metatile = request.metatile ?? this.defaultMetatile;

    const { boundingBox: geomBbox, feature, isGeojson } = this.extractBboxAndFeature(area);

    const breakdown: ZoomEstimation[] = [];
    let totalMetatiles = 0;

    for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
      const upperLeft = lonLatZoomToTile({ lon: geomBbox.west, lat: geomBbox.north }, zoom, metatile);
      const lowerRight = lonLatZoomToTile({ lon: geomBbox.east, lat: geomBbox.south }, zoom, metatile);

      let zoomMetatiles = 0;

      if (!isGeojson || !feature) {
        // Pure BBOX formula
        const cols = Math.max(0, lowerRight.x - upperLeft.x + 1);
        const rows = Math.max(0, lowerRight.y - upperLeft.y + 1);
        zoomMetatiles = cols * rows;
      } else {
        // Detailed polygon intersection test
        for (let y = upperLeft.y; y <= lowerRight.y; y++) {
          for (let x = upperLeft.x; x <= lowerRight.x; x++) {
            const candidateTile: Tile = { x, y, z: zoom, metatile };
            const tileBbox = tileToBoundingBox(candidateTile);
            const tilePoly = this.boundingBoxToPolygonFeature(tileBbox);

            if (turf.booleanIntersects(tilePoly as Feature<Polygon>, feature as Feature<Polygon | MultiPolygon>)) {
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

  private extractBboxAndFeature(area: EstimateRequest['area']): {
    boundingBox: BoundingBox;
    feature?: Feature;
    isGeojson: boolean;
  } {
    if (Array.isArray(area) && area.length === 4) {
      return {
        boundingBox: { west: area[0], south: area[1], east: area[2], north: area[3] },
        isGeojson: false,
      };
    }

    const geojsonObj = area as Feature;
    const computedBbox = turf.bbox(geojsonObj);
    return {
      boundingBox: { west: computedBbox[0], south: computedBbox[1], east: computedBbox[2], north: computedBbox[3] },
      feature: geojsonObj,
      isGeojson: true,
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
