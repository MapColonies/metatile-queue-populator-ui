# ADR 0001: Interactive Spatial Preset Creation and File Import

## Status
Accepted

## Context
Previously, creating a preset in the Presets Tab required manually typing or pasting raw coordinate strings (e.g. `[minLon, minLat, maxLon, maxLat]` or raw GeoJSON). This was error-prone and unintuitive. Users need to create presets directly from drawn map geometries or by dropping spatial files (`.shp.zip`, `.kml`, `.geojson`, `.wkt`).

## Decision
1. Eliminate all raw coordinate text fields from the Preset Creation form.
2. Support dual creation paths:
   - **Tab 0 (Map Queue Creator)**: Draw BBOX/Polygon or drop a file on the main OpenLayers map and click "Save Preset".
   - **Tab 3 (Presets Manager)**: Open "Create New Area Preset" dialog containing an embedded `<SpatialDropzone />` and mini-map drawing component to draw or upload geometries in-place.
3. Leverage the existing BFF `POST /spatial/convert` endpoint for Shapefile `.zip`, KML, GeoJSON, and WKT processing.
4. Display geometry validation status with a visual chip, bounding extent readout, and disable submission until a valid geometry is loaded.

## Consequences
- Preset creation becomes completely visual and zero-error.
- Existing `<SpatialDropzone />` and drawing utilities are reused without duplicate parsing logic.
