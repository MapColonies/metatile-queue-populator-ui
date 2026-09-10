export interface PopulatorTarget {
  id: string;
  name: string;
  projectName: string;
  url: string;
  partOf: string;
  dbName: string;
  source: "auto" | "static";
  isDefault: boolean;
  status?: "UP" | "DOWN" | "UNKNOWN";
  emoji?: string;
}

export interface TargetsResponse {
  targets: PopulatorTarget[];
}

export const PIPELINE_EMOJIS: readonly string[] = [
  "🗺️", // World map / GIS
  "🏢", // Buildings / Architecture
  "🧭", // Compass / Navigation
  "🛰️", // Satellite / Earth Observation
  "⛰️", // Mountain / Topography / Elevation
  "🛣️", // Motorway / Highways / Roads
  "🌐", // Globe / Network / Web mapping
  "🏗️", // Construction / Urban development
  "🌍", // Planet / Global coverage
  "📐", // Ruler / Geometry / Spatial vector
  "🏙️", // Cityscape / Skyline
  "🗾", // Silhouette / Islands / Cartography
  "🌲", // Forest / Nature / Landcover
  "🚂", // Railway / Transportation
  "⚓", // Maritime / Hydrography / Ports
];

export function getTargetEmoji(nameOrId?: string): string {
  if (!nameOrId) return PIPELINE_EMOJIS[0]!;
  let hash = 0;
  const str = nameOrId.toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return PIPELINE_EMOJIS[Math.abs(hash) % PIPELINE_EMOJIS.length]!;
}
