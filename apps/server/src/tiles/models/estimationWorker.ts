import { parentPort, workerData } from 'worker_threads';
import type { BoundingBox, Tile } from '@map-colonies/tile-calc';
import { lonLatZoomToTile, tileToBoundingBox } from '@map-colonies/tile-calc';
import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson';

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

export interface EstimateWorkerInput {
  area: [number, number, number, number] | Feature | FeatureCollection | Record<string, any>;
  minZoom: number;
  maxZoom: number;
  metatile: number;
  timeoutMs: number;
}

export function boundingBoxToPolygonFeature(bbox: BoundingBox): Feature<Polygon> {
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

export function extractBboxAndPolygons(area: EstimateWorkerInput['area']): {
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

export function calculateTileEstimation(input: EstimateWorkerInput): EstimationResult {
  const { area, minZoom, maxZoom, metatile, timeoutMs } = input;
  const startTime = Date.now();

  const { boundingBox: geomBbox, targetPolygons, isGeojson } = extractBboxAndPolygons(area);
  const breakdown: ZoomEstimation[] = [];
  let totalMetatiles = 0;

  for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`TIMEOUT: Tile estimation exceeded ${Math.round(timeoutMs / 1000)}s execution timeout limit.`);
    }

    const upperLeft = lonLatZoomToTile({ lon: geomBbox.west, lat: geomBbox.north }, zoom, metatile);
    const lowerRight = lonLatZoomToTile({ lon: geomBbox.east, lat: geomBbox.south }, zoom, metatile);

    const totalBboxCols = Math.max(0, lowerRight.x - upperLeft.x + 1);
    const totalBboxRows = Math.max(0, lowerRight.y - upperLeft.y + 1);
    const bboxCandidateCount = totalBboxCols * totalBboxRows;

    let zoomMetatiles = 0;

    if (!isGeojson || targetPolygons.length === 0) {
      zoomMetatiles = bboxCandidateCount;
    } else {
      const polygonWithBboxes = targetPolygons.map((poly) => ({
        poly,
        bbox: turf.bbox(poly),
      }));

      for (let y = upperLeft.y; y <= lowerRight.y; y++) {
        if (Date.now() - startTime > timeoutMs) {
          throw new Error(`TIMEOUT: Tile estimation exceeded ${Math.round(timeoutMs / 1000)}s execution timeout limit.`);
        }

        for (let x = upperLeft.x; x <= lowerRight.x; x++) {
          const candidateTile: Tile = { x, y, z: zoom, metatile };
          const tileBbox = tileToBoundingBox(candidateTile);

          let intersects = false;
          for (const { poly, bbox } of polygonWithBboxes) {
            if (tileBbox.east < bbox[0] || tileBbox.west > bbox[2] || tileBbox.north < bbox[1] || tileBbox.south > bbox[3]) {
              continue;
            }

            const tilePoly = boundingBoxToPolygonFeature(tileBbox);
            if (turf.booleanIntersects(tilePoly, poly)) {
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

if (parentPort && workerData) {
  try {
    const result = calculateTileEstimation(workerData as EstimateWorkerInput);
    parentPort.postMessage({
      success: true,
      result,
    });
  } catch (err: any) {
    parentPort.postMessage({
      success: false,
      error: err.message,
      isTimeout: String(err.message).startsWith('TIMEOUT:'),
    });
  }
}
