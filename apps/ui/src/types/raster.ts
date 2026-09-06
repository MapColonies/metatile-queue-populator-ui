export interface DefaultMapConfig {
  useOsm?: boolean;
  productId?: string;
  productType?: string;
}

export interface RasterConfig {
  cswUrl: string;
  token?: string;
  defaultMap?: DefaultMapConfig;
}

export interface RasterLink {
  scheme: "WMTS" | "WMTS_KVP" | "WMTS_BASE" | string;
  name: string;
  url: string;
  description?: string;
}

export interface RasterRecord {
  id: string;
  productId: string;
  productName: string;
  productType?: string;
  description?: string;
  updateDate?: string;
  minResolutionDeg?: number;
  maxResolutionDeg?: number;
  footprint?: any; // GeoJSON Polygon/MultiPolygon
  bbox?: [number, number, number, number]; // [minX, minY, maxX, maxY]
  links: RasterLink[];
}

export interface CSWQueryResult {
  records: RasterRecord[];
  totalMatched: number;
  returned: number;
  nextRecord?: number;
}

export interface ActiveRasterLayer {
  id: string;
  layerIdentifier: string;
  productName: string;
  productType?: string;
  capabilitiesUrl: string;
  zIndex: number;
  opacity: number; // 0.0 to 1.0
  visible: boolean;
  extent?: [number, number, number, number]; // EPSG:3857 or 4326
  olLayer?: any;
}
