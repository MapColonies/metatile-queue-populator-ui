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
