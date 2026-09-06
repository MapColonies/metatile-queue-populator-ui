# Domain Glossary

### Preset

A saved, reusable operational configuration containing a geographical boundary (`BBOX` or `GeoJSON` Polygon/FeatureCollection), zoom range (`minZoom` to `maxZoom`), and queue priority.

### Spatial Preset Geometry

The spatial boundary definition associated with a Preset. Can be created either by drawing directly on an OpenLayers map (BBOX or Polygon) or by importing spatial files (Shapefile `.zip`, `.kml`, `.geojson`, `.wkt`) via the spatial converter service.

### Spatial Converter

A BFF service (`POST /spatial/convert`) that ingests multi-format spatial files (Zipped Shapefiles, KML, GeoJSON, WKT) and transforms them into standardized GeoJSON Feature or FeatureCollection representations.
