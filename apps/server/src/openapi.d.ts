/* eslint-disable */
// This file was auto-generated. Do not edit manually.
// To update, run the error generation script again.

import type { TypedRequestHandlers as ImportedTypedRequestHandlers } from '@map-colonies/openapi-express-types';
export type paths = {
  '/tiles/area': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Add all metatiles in given area to queue */
    post: operations['postTilesByArea'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/tiles/estimate': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Estimate tile and metatile counts for a given area and zoom range */
    post: operations['estimateTiles'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/spatial/convert': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Convert uploaded Shapefile (.zip), KML, WKT, or GeoJSON to WGS84 GeoJSON */
    post: operations['convertSpatial'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/queue/status': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get real-time queue health, active jobs, and status */
    get: operations['getQueueStatus'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/queue/metrics': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get queue metrics overview */
    get: operations['getQueueMetrics'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/history': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get submission history */
    get: operations['getHistory'];
    put?: never;
    /** Record new job submission in history */
    post: operations['recordHistory'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/presets': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get list of saved area presets */
    get: operations['getPresets'];
    put?: never;
    /** Save a new area preset */
    post: operations['createPreset'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/presets/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    /** Delete a saved area preset */
    delete: operations['deletePreset'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/tiles/list': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Add specific metatiles to queue */
    post: operations['postTilesList'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
};
export type webhooks = Record<string, never>;
export type components = {
  schemas: {
    Error: {
      message: string;
    };
    TilesListRequest: {
      x: number;
      y: number;
      z: number;
      /** @default 8 */
      metatile: number;
    }[];
    BaseAreaRequest: {
      minZoom: number;
      maxZoom: number;
      /** @default 0 */
      priority: number;
    };
    BboxTilesRequest: components['schemas']['BaseAreaRequest'] & {
      area: number[];
    };
    GeometryTilesRequest: components['schemas']['BaseAreaRequest'] & {
      area: {
        type: string;
      };
    };
    MultiAreaTilesRequest: (components['schemas']['BboxTilesRequest'] | components['schemas']['GeometryTilesRequest'])[];
  };
  responses: {
    /** @description Bad request */
    BadRequest: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['Error'];
      };
    };
    /** @description Not Found */
    NotFound: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['Error'];
      };
    };
    /** @description Conflict */
    Conflict: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['Error'];
      };
    };
    /** @description Unexpected Error */
    UnexpectedError: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['Error'];
      };
    };
  };
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
};
export type $defs = Record<string, never>;
export interface operations {
  postTilesByArea: {
    parameters: {
      query?: {
        force?: boolean;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json':
          components['schemas']['BboxTilesRequest'] | components['schemas']['GeometryTilesRequest'] | components['schemas']['MultiAreaTilesRequest'];
      };
    };
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': {
            message?: string;
          };
        };
      };
      400: components['responses']['BadRequest'];
      409: components['responses']['Conflict'];
      '5XX': components['responses']['UnexpectedError'];
    };
  };
  estimateTiles: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': {
          minZoom: number;
          maxZoom: number;
          /** @default 8 */
          metatile?: number;
          area: number[] | Record<string, never>;
        };
      };
    };
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': {
            totalMetatiles: number;
            totalTiles: number;
            metatileSize: number;
            breakdown: {
              zoom?: number;
              metatiles?: number;
              tiles?: number;
            }[];
          };
        };
      };
      400: components['responses']['BadRequest'];
      '5XX': components['responses']['UnexpectedError'];
    };
  };
  convertSpatial: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: {
      content: {
        'multipart/form-data': {
          /** Format: binary */
          file?: string;
        };
        'application/json': {
          text?: string;
          format?: string;
        };
      };
    };
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': {
            /** @example FeatureCollection */
            type: string;
            features: Record<string, never>[];
          };
        };
      };
      400: components['responses']['BadRequest'];
      '5XX': components['responses']['UnexpectedError'];
    };
  };
  getQueueStatus: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': {
            /** @example UP */
            status: string;
            timestamp: string;
            populatorServiceUrl?: string;
            queues: Record<string, never>[];
            summary: Record<string, never>;
          };
        };
      };
    };
  };
  getQueueMetrics: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': Record<string, never>;
        };
      };
    };
  };
  getHistory: {
    parameters: {
      query?: {
        limit?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': Record<string, never>[];
        };
      };
    };
  };
  recordHistory: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': {
          /** @enum {string} */
          type: 'area' | 'list';
          parameters: Record<string, never>;
          /** @enum {string} */
          status: 'SUCCESS' | 'FAILED';
          responseMessage?: string;
        };
      };
    };
    responses: {
      /** @description Created */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': Record<string, never>;
        };
      };
    };
  };
  getPresets: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': Record<string, never>[];
        };
      };
    };
  };
  createPreset: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': {
          name: string;
          description?: string;
          minZoom: number;
          maxZoom: number;
          priority?: number;
          area: number[] | Record<string, never>;
        };
      };
    };
    responses: {
      /** @description Created */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': Record<string, never>;
        };
      };
    };
  };
  deletePreset: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      404: components['responses']['NotFound'];
    };
  };
  postTilesList: {
    parameters: {
      query?: {
        force?: boolean;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['TilesListRequest'];
      };
    };
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': {
            message?: string;
          };
        };
      };
      400: components['responses']['BadRequest'];
      '5XX': components['responses']['UnexpectedError'];
    };
  };
}
export type TypedRequestHandlers = ImportedTypedRequestHandlers<paths, operations>;
