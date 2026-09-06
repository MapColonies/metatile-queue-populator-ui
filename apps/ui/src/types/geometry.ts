export type DrawMode = "none" | "bbox" | "polygon";

export interface BboxArea {
  type: "bbox";
  bbox: [number, number, number, number]; // [minX, minY, maxX, maxY]
}

export interface GeoJsonArea {
  type: "geojson";
  geojson: Record<string, any>;
}

export type SelectedArea = BboxArea | GeoJsonArea | null;
