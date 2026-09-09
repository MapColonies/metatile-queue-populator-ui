import type { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { kml } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import Wkt from 'wicket';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import { SERVICES } from '../../common/constants';
import { HttpError } from '../../common/errors';
import httpStatus from 'http-status-codes';

@injectable()
export class SpatialConverter {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger) {}

  public async parseBuffer(buffer: Buffer, originalFilename: string): Promise<FeatureCollection> {
    const extension = originalFilename.split('.').pop()?.toLowerCase() || '';

    this.logger.info({ msg: 'Parsing spatial file', filename: originalFilename, extension });

    try {
      switch (extension) {
        case 'zip':
          return await this.parseShapefileZip(buffer);
        case 'kml':
          return this.parseKml(buffer.toString('utf8'));
        case 'wkt':
        case 'txt':
          return this.parseWkt(buffer.toString('utf8'));
        case 'geojson':
        case 'json':
          return this.parseGeoJson(buffer.toString('utf8'));
        default:
          // Attempt JSON parse first, then WKT, then KML
          return this.parseUnknownFormat(buffer);
      }
    } catch (err: any) {
      this.logger.error({ msg: 'Failed to parse spatial file', filename: originalFilename, error: err.message });
      throw new HttpError(err.message || 'Invalid or unsupported spatial file format', httpStatus.BAD_REQUEST);
    }
  }

  public parseText(text: string, format?: string): FeatureCollection {
    const cleanText = text.trim();
    if (format === 'kml' || cleanText.startsWith('<') || cleanText.includes('<kml')) {
      return this.parseKml(cleanText);
    }
    if (format === 'wkt' || /^(POLYGON|MULTIPOLYGON|POINT|MULTIPOINT|LINESTRING|MULTILINESTRING|GEOMETRYCOLLECTION)/i.test(cleanText)) {
      return this.parseWkt(cleanText);
    }
    return this.parseGeoJson(cleanText);
  }

  private async parseShapefileZip(buffer: Buffer): Promise<FeatureCollection> {
    const shpModule: any = await import('shpjs');
    const shp = shpModule.default || shpModule;
    const parsed = await shp(buffer);
    if (Array.isArray(parsed)) {
      // Multiple shapefiles in one zip -> combine features
      const features = parsed.flatMap((fc) => fc.features);
      return {
        type: 'FeatureCollection',
        features,
      };
    }
    return parsed as FeatureCollection;
  }

  private parseKml(kmlString: string): FeatureCollection {
    const dom = new DOMParser().parseFromString(kmlString, 'text/xml');
    const geojson = kml(dom) as FeatureCollection;
    if (Array.isArray(geojson.features)) {
      geojson.features.forEach((f) => {
        if (f && typeof f === 'object' && (!f.properties || typeof f.properties !== 'object')) {
          f.properties = {};
        }
      });
    }
    return geojson;
  }

  private parseWkt(wktString: string): FeatureCollection {
    const wkt = new Wkt.Wkt();
    wkt.read(wktString);
    const geometry = wkt.toJson() as Geometry;

    const feature: Feature = {
      type: 'Feature',
      properties: {},
      geometry,
    };

    return {
      type: 'FeatureCollection',
      features: [feature],
    };
  }

  private parseGeoJson(geoJsonString: string): FeatureCollection {
    const parsed = JSON.parse(geoJsonString) as Record<string, any>;

    if (parsed.type === 'FeatureCollection') {
      if (Array.isArray(parsed.features)) {
        parsed.features.forEach((f: any) => {
          if (f && typeof f === 'object' && (!f.properties || typeof f.properties !== 'object')) {
            f.properties = {};
          }
        });
      }
      return parsed as FeatureCollection;
    }

    if (parsed.type === 'Feature') {
      const feature = {
        ...parsed,
        properties: parsed.properties && typeof parsed.properties === 'object' ? parsed.properties : {},
      } as Feature;
      return {
        type: 'FeatureCollection',
        features: [feature],
      };
    }

    // Bare geometry
    if (parsed.type && parsed.coordinates) {
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: parsed as Geometry,
          },
        ],
      };
    }

    throw new Error('Provided JSON is not a valid GeoJSON object.');
  }

  private parseUnknownFormat(buffer: Buffer): FeatureCollection {
    const text = buffer.toString('utf8');
    try {
      return this.parseGeoJson(text);
    } catch {
      try {
        return this.parseWkt(text);
      } catch {
        return this.parseKml(text);
      }
    }
  }
}
