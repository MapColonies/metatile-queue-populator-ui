import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import { optionsFromCapabilities } from 'ol/source/WMTS';
import WMTS from 'ol/source/WMTS';
import XYZ from 'ol/source/XYZ';
import TileLayer from 'ol/layer/Tile';
import { transformExtent } from 'ol/proj';
import { ActiveRasterLayer, RasterRecord } from '../types/raster.ts';

const parser = new WMTSCapabilities();

export interface CreateWMTSLayerParams {
  record: RasterRecord;
  token?: string;
  zIndex?: number;
  opacity?: number;
}

export async function createWMTSLayerFromRecord(params: CreateWMTSLayerParams): Promise<ActiveRasterLayer> {
  const { record, token, zIndex = 1, opacity = 1.0 } = params;

  // 1. Find WMTS capabilities link or base URL
  const wmtsCapLink = record.links.find((l) => l.scheme === 'WMTS' || l.scheme === 'WMTS_KVP');
  const wmtsBaseLink = record.links.find((l) => l.scheme === 'WMTS_BASE');

  let capabilitiesUrl = wmtsCapLink?.url;
  if (!capabilitiesUrl && wmtsBaseLink?.url) {
    capabilitiesUrl = `${wmtsBaseLink.url}/1.0.0/WMTSCapabilities.xml`;
  }

  if (!capabilitiesUrl) {
    throw new Error(`No WMTS endpoint found in links for layer ${record.productId}`);
  }

  // 2. Fetch Capabilities with Token
  let fetchUrl = capabilitiesUrl;
  if (token) {
    const sep = fetchUrl.includes('?') ? '&' : '?';
    fetchUrl = `${fetchUrl}${sep}token=${encodeURIComponent(token)}`;
  }

  // 5. Calculate extent in EPSG:3857 for layer bounding
  let layerExtent: [number, number, number, number] | undefined = undefined;
  if (record.bbox) {
    try {
      layerExtent = transformExtent(record.bbox, 'EPSG:4326', 'EPSG:3857') as [number, number, number, number];
    } catch (e) {
      console.warn('Failed to transform bbox extent to EPSG:3857', e);
    }
  }

  const desiredIdentifier = wmtsCapLink?.name || record.productId;

  // Attempt 1: Fetch and parse standard WMTSCapabilities.xml
  try {
    const response = await fetch(fetchUrl);
    if (response.ok) {
      const capabilitiesText = await response.text();
      const parserResult = parser.read(capabilitiesText);

      const layerOptions = optionsFromCapabilities(parserResult, {
        layer: desiredIdentifier,
      });

      if (layerOptions) {
        if (token && layerOptions.urls) {
          layerOptions.urls = layerOptions.urls.map((u) => {
            const s = u.includes('?') ? '&' : '?';
            return `${u}${s}token=${encodeURIComponent(token)}`;
          });
        }

        const wmtsSource = new WMTS(layerOptions);
        const tileLayer = new TileLayer({
          source: wmtsSource,
          extent: layerExtent,
          opacity,
          zIndex,
          visible: true,
        });

        return {
          id: record.id,
          layerIdentifier: desiredIdentifier,
          productName: record.productName,
          productType: record.productType,
          capabilitiesUrl,
          zIndex,
          opacity,
          visible: true,
          extent: layerExtent,
          olLayer: tileLayer,
        };
      }
    }
  } catch (err) {
    console.warn(`Could not parse WMTS Capabilities from ${fetchUrl}:`, err);
  }

  // Attempt 2: Use WMTS_BASE link extracted from CSW record
  if (wmtsBaseLink?.url) {
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const fallbackUrl = `${wmtsBaseLink.url.replace(/\/$/, '')}/${encodeURIComponent(desiredIdentifier)}/{z}/{x}/{y}.png${tokenParam}`;

    const fallbackLayer = new TileLayer({
      source: new XYZ({
        url: fallbackUrl,
        projection: 'EPSG:3857',
      }),
      extent: layerExtent,
      opacity,
      zIndex,
      visible: true,
    });

    return {
      id: record.id,
      layerIdentifier: desiredIdentifier,
      productName: record.productName,
      productType: record.productType,
      capabilitiesUrl,
      zIndex,
      opacity,
      visible: true,
      extent: layerExtent,
      olLayer: fallbackLayer,
    };
  }

  throw new Error(`Failed to load WMTS layer for "${record.productName}". Neither WMTS Capabilities nor WMTS_BASE endpoint succeeded.`);
}
