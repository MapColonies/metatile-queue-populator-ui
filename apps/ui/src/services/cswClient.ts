import { CSWQueryResult, RasterLink, RasterRecord } from '../types/raster.ts';

export interface FetchRasterRecordsParams {
  cswUrl: string;
  token?: string;
  startPosition?: number;
  maxRecords?: number;
  queryText?: string;
  productType?: string;
  productId?: string;
}

export function buildGetRecordsXML(params: {
  startPosition: number;
  maxRecords: number;
  queryText?: string;
  productType?: string;
  productId?: string;
}): string {
  const { startPosition, maxRecords, queryText, productType, productId } = params;

  let filterXML = '';
  const filters: string[] = [];

  if (productId && productId.trim().length > 0) {
    filters.push(`
      <PropertyIsEqualTo>
        <PropertyName>mc:productId</PropertyName>
        <Literal>${escapeXml(productId.trim())}</Literal>
      </PropertyIsEqualTo>
    `);
  }

  if (productType && productType !== 'ALL') {
    filters.push(`
      <PropertyIsEqualTo>
        <PropertyName>mc:productType</PropertyName>
        <Literal>${escapeXml(productType)}</Literal>
      </PropertyIsEqualTo>
    `);
  }

  if (queryText && queryText.trim().length > 0) {
    const cleanQuery = escapeXml(queryText.trim());
    filters.push(`
      <PropertyIsLike wildCard="%" singleChar="_" escapeChar="\\">
        <PropertyName>mc:productName</PropertyName>
        <Literal>%${cleanQuery}%</Literal>
      </PropertyIsLike>
    `);
  }

  if (filters.length === 1) {
    filterXML = `
      <csw:Constraint version="1.1.0">
        <Filter xmlns="http://www.opengis.net/ogc">
          ${filters[0]}
        </Filter>
      </csw:Constraint>
    `;
  } else if (filters.length > 1) {
    filterXML = `
      <csw:Constraint version="1.1.0">
        <Filter xmlns="http://www.opengis.net/ogc">
          <And>
            ${filters.join('')}
          </And>
        </Filter>
      </csw:Constraint>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<csw:GetRecords xmlns:csw="http://www.opengis.net/cat/csw/2.0.2"
  service="CSW"
  version="2.0.2"
  resultType="results"
  outputSchema="http://schema.mapcolonies.com/raster"
  startPosition="${startPosition}"
  maxRecords="${maxRecords}"
  xmlns:mc="http://schema.mapcolonies.com/raster">
  <csw:Query typeNames="mc:MCRasterRecord">
    <csw:ElementSetName>full</csw:ElementSetName>
    ${filterXML}
  </csw:Query>
</csw:GetRecords>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

export function parseCSWResponse(xmlText: string): CSWQueryResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // Check for search results metadata
  const searchResults = xmlDoc.getElementsByTagNameNS('http://www.opengis.net/cat/csw/2.0.2', 'SearchResults')[0] ||
    xmlDoc.querySelector('SearchResults');

  const totalMatched = searchResults ? parseInt(searchResults.getAttribute('numberOfRecordsMatched') || '0', 10) : 0;
  const returned = searchResults ? parseInt(searchResults.getAttribute('numberOfRecordsReturned') || '0', 10) : 0;
  const nextRecordAttr = searchResults?.getAttribute('nextRecord');
  const nextRecord = nextRecordAttr ? parseInt(nextRecordAttr, 10) : undefined;

  const records: RasterRecord[] = [];
  const recordNodes = xmlDoc.getElementsByTagNameNS('http://schema.mapcolonies.com/raster', 'MCRasterRecord').length > 0
    ? xmlDoc.getElementsByTagNameNS('http://schema.mapcolonies.com/raster', 'MCRasterRecord')
    : xmlDoc.querySelectorAll('MCRasterRecord');

  for (let i = 0; i < recordNodes.length; i++) {
    const node = recordNodes[i];

    const getText = (tagName: string): string => {
      const el = node.getElementsByTagNameNS('http://schema.mapcolonies.com/raster', tagName)[0] ||
        node.querySelector(tagName) ||
        node.getElementsByTagName(tagName)[0];
      return el?.textContent?.trim() || '';
    };

    const id = getText('id') || getText('identifier') || `raster-record-${i}`;
    const productId = getText('productId') || id;
    const productName = getText('productName') || productId;
    const productType = getText('productType') || 'Orthophoto';
    const description = getText('description') || '';
    const updateDate = getText('updateDate') || getText('creationDate') || '';
    const minResolution = parseFloat(getText('minResolutionDeg')) || undefined;
    const maxResolution = parseFloat(getText('maxResolutionDeg')) || undefined;

    // Parse Footprint GeoJSON
    let footprint: any = undefined;
    let bbox: [number, number, number, number] | undefined = undefined;

    const footprintText = getText('footprint');
    if (footprintText) {
      try {
        footprint = JSON.parse(footprintText);
        if (footprint) {
          bbox = calculateGeoJSONBBox(footprint);
        }
      } catch (e) {
        console.warn('Failed to parse footprint JSON for', productId, e);
      }
    }

    // Fallback bbox from <ows:BoundingBox> or <mc:bbox>
    if (!bbox) {
      const lowerCorner = node.querySelector('LowerCorner')?.textContent?.trim()?.split(' ').map(Number);
      const upperCorner = node.querySelector('UpperCorner')?.textContent?.trim()?.split(' ').map(Number);
      if (lowerCorner && upperCorner && lowerCorner.length === 2 && upperCorner.length === 2) {
        bbox = [lowerCorner[0], lowerCorner[1], upperCorner[0], upperCorner[1]];
      }
    }

    // Parse Links
    const links: RasterLink[] = [];
    const linkNodes = node.getElementsByTagNameNS('http://schema.mapcolonies.com/raster', 'links').length > 0
      ? node.getElementsByTagNameNS('http://schema.mapcolonies.com/raster', 'links')
      : node.querySelectorAll('links');

    for (let j = 0; j < linkNodes.length; j++) {
      const linkEl = linkNodes[j];
      const scheme = linkEl.getAttribute('scheme') || '';
      const name = linkEl.getAttribute('name') || productId;
      const description = linkEl.getAttribute('description') || '';
      let url = linkEl.textContent?.trim() || '';
      // Remove wrapping single quotes if present (e.g. '<URL>')
      url = url.replace(/^['"]|['"]$/g, '');

      if (url) {
        links.push({
          scheme,
          name,
          url,
          description,
        });
      }
    }

    records.push({
      id,
      productId,
      productName,
      productType,
      description,
      updateDate,
      minResolutionDeg: minResolution,
      maxResolutionDeg: maxResolution,
      footprint,
      bbox,
      links,
    });
  }

  return {
    records,
    totalMatched: totalMatched || records.length,
    returned: returned || records.length,
    nextRecord,
  };
}

export function calculateGeoJSONBBox(geojson: any): [number, number, number, number] | undefined {
  if (!geojson) return undefined;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const traverse = (coords: any) => {
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const [x, y] = coords;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    } else if (Array.isArray(coords)) {
      for (const item of coords) {
        traverse(item);
      }
    }
  };

  if (geojson.coordinates) {
    traverse(geojson.coordinates);
  } else if (geojson.geometry?.coordinates) {
    traverse(geojson.geometry.coordinates);
  }

  if (minX === Infinity || minY === Infinity) return undefined;
  return [minX, minY, maxX, maxY];
}

export async function fetchRasterRecords(params: FetchRasterRecordsParams): Promise<CSWQueryResult> {
  const { cswUrl, token, startPosition = 1, maxRecords = 10, queryText, productType, productId } = params;

  let targetUrl = cswUrl;
  if (token) {
    const separator = targetUrl.includes('?') ? '&' : '?';
    targetUrl = `${targetUrl}${separator}token=${encodeURIComponent(token)}`;
  }

  const xmlBody = buildGetRecordsXML({
    startPosition,
    maxRecords,
    queryText,
    productType,
    productId,
  });

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      'Accept': 'application/xml',
    },
    body: xmlBody,
  });

  if (!response.ok) {
    throw new Error(`CSW Catalog query failed with HTTP status ${response.status}: ${response.statusText}`);
  }

  const responseXml = await response.text();
  return parseCSWResponse(responseXml);
}
