export interface AppConfig {
  defaultMetatile: number;
  maxZoom: number;
  minZoom: number;
  defaultZoomRange: [number, number];
  defaultMapCenter: [number, number];
  defaultMapZoom: number;
}

export const appConfig: AppConfig = {
  defaultMetatile: 8,
  minZoom: 0,
  maxZoom: 18,
  defaultZoomRange: [0, 10],
  defaultMapCenter: [34.7818, 32.0853], // [Lon, Lat]
  defaultMapZoom: 7,
};
