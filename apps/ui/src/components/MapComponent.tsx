import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip, ButtonGroup, Chip, Divider, ToggleButtonGroup, ToggleButton } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import PolylineIcon from '@mui/icons-material/Polyline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PanToolIcon from '@mui/icons-material/PanTool';
import GridOnIcon from '@mui/icons-material/GridOn';
import GridOffIcon from '@mui/icons-material/GridOff';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import TileDebug from 'ol/source/TileDebug';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Draw, { createBox } from 'ol/interaction/Draw';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Fill, Stroke } from 'ol/style';
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import { DrawMode, SelectedArea } from '../types/geometry.ts';
import { ActiveRasterLayer, RasterConfig, RasterRecord } from '../types/raster.ts';
import { createWMTSLayerFromRecord } from '../services/wmtsHelper.ts';
import { fetchRasterRecords } from '../services/cswClient.ts';
import { LayerManager } from './LayerManager.tsx';
import { RasterCatalogDrawer } from './RasterCatalogDrawer.tsx';
import 'ol/ol.css';

interface MapComponentProps {
  externalArea?: SelectedArea;
  onAreaSelected?: (area: SelectedArea) => void;
  onMapReady?: (map: Map) => void;
}

const vectorStyle = new Style({
  fill: new Fill({
    color: 'rgba(0, 163, 224, 0.25)', // Primary accent translucent
  }),
  stroke: new Stroke({
    color: '#00a3e0',
    width: 2.5,
  }),
});

export const MapComponent: React.FC<MapComponentProps> = ({ externalArea, onAreaSelected, onMapReady }) => {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource>(new VectorSource());
  const osmLayerRef = useRef<TileLayer<OSM> | null>(null);
  const debugLayerRef = useRef<TileLayer<TileDebug> | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);

  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [showDebugLayer, setShowDebugLayer] = useState<boolean>(false);
  const [showOsmBase, setShowOsmBase] = useState<boolean>(true);
  const [activeRasterLayers, setActiveRasterLayers] = useState<ActiveRasterLayer[]>([]);
  const [catalogDrawerOpen, setCatalogDrawerOpen] = useState<boolean>(false);
  const [rasterConfig, setRasterConfig] = useState<RasterConfig | null>(null);
  const [coordinates, setCoordinates] = useState<{ lon: string; lat: string }>({ lon: '0.00000000', lat: '0.00000000' });
  const [zoomLevel, setZoomLevel] = useState<number>(7);
  const [hasDrawnGeometry, setHasDrawnGeometry] = useState<boolean>(false);

  // Sync external loaded area (e.g. from File Dropzone, Preset, or Tab Clear)
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const source = vectorSourceRef.current;
    source.clear();

    if (!externalArea) {
      setHasDrawnGeometry(false);
      // Reset view to default center and zoom when clearing area / starting fresh
      map.updateSize();
      map.getView().animate({
        center: fromLonLat([34.7818, 32.0853]),
        zoom: 7,
        duration: 400,
      });
      return;
    }

    const geojsonFormat = new GeoJSON();
    let features: any[] = [];

    try {
      if (externalArea.type === 'geojson') {
        const raw = externalArea.geojson;
        if (raw) {
          if (raw.type === 'FeatureCollection') {
            features = geojsonFormat.readFeatures(raw, {
              featureProjection: 'EPSG:3857',
              dataProjection: 'EPSG:4326',
            });
          } else if (raw.type === 'Feature') {
            features = [
              geojsonFormat.readFeature(raw, {
                featureProjection: 'EPSG:3857',
                dataProjection: 'EPSG:4326',
              }),
            ];
          } else if (raw.type && raw.coordinates) {
            // Pure geometry object (Polygon, MultiPolygon, etc.)
            features = [
              geojsonFormat.readFeature(
                {
                  type: 'Feature',
                  properties: {},
                  geometry: raw,
                },
                {
                  featureProjection: 'EPSG:3857',
                  dataProjection: 'EPSG:4326',
                }
              ),
            ];
          }
        }
      } else if (externalArea.type === 'bbox') {
        const [west, south, east, north] = externalArea.bbox;
        const polyFeature = geojsonFormat.readFeature(
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [west, south],
                  [east, south],
                  [east, north],
                  [west, north],
                  [west, south],
                ],
              ],
            },
          },
          {
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4326',
          }
        );
        features = [polyFeature];
      }
    } catch (err) {
      console.error('Failed to parse loaded geometry for OpenLayers:', err);
    }

    if (features.length > 0) {
      source.addFeatures(features);
      setHasDrawnGeometry(true);

      // Force OpenLayers to recalculate viewport size when transitioning tabs
      map.updateSize();

      const extent = source.getExtent();
      if (extent && !extent.some(isNaN) && extent[0] !== Infinity) {
        setTimeout(() => {
          map.updateSize();
          map.getView().fit(extent, {
            padding: [70, 70, 70, 70],
            maxZoom: 16,
            duration: 400,
          });
        }, 60);
      }
    } else {
      setHasDrawnGeometry(false);
    }
  }, [externalArea]);

  const updateDrawnArea = useCallback(() => {
    const features = vectorSourceRef.current.getFeatures();
    if (features.length === 0) {
      setHasDrawnGeometry(false);
      onAreaSelected?.(null);
      return;
    }

    setHasDrawnGeometry(true);
    const feature = features[features.length - 1]; // Latest feature
    const geometry = feature.getGeometry();
    if (!geometry) return;

    const geojsonFormat = new GeoJSON();
    const geojsonObject = geojsonFormat.writeFeatureObject(feature, {
      featureProjection: 'EPSG:3857',
      dataProjection: 'EPSG:4326',
    });

    if (drawMode === 'bbox') {
      const extent = geometry.getExtent();
      const minPoint = toLonLat([extent[0], extent[1]]);
      const maxPoint = toLonLat([extent[2], extent[3]]);
      const bbox: [number, number, number, number] = [
        Number(minPoint[0].toFixed(6)),
        Number(minPoint[1].toFixed(6)),
        Number(maxPoint[0].toFixed(6)),
        Number(maxPoint[1].toFixed(6)),
      ];
      onAreaSelected?.({ type: 'bbox', bbox });
    } else {
      onAreaSelected?.({ type: 'geojson', geojson: geojsonObject });
    }
  }, [drawMode, onAreaSelected]);

  // Handle active drawing interaction
  const setDrawingInteraction = useCallback((mode: DrawMode) => {
    const map = mapRef.current;
    if (!map) return;

    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }

    if (mode === 'none') {
      return;
    }

    const draw = new Draw({
      source: vectorSourceRef.current,
      type: mode === 'bbox' ? 'Circle' : 'Polygon',
      geometryFunction: mode === 'bbox' ? createBox() : undefined,
    });

    draw.on('drawstart', () => {
      // Clear previous feature so only one active area exists
      vectorSourceRef.current.clear();
    });

    draw.on('drawend', () => {
      setTimeout(() => {
        updateDrawnArea();
      }, 50);
    });

    map.addInteraction(draw);
    drawInteractionRef.current = draw;
  }, [updateDrawnArea]);

  // Fetch raster configuration from BFF and handle default map settings
  useEffect(() => {
    fetch('/api/config/raster')
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data: RasterConfig | null) => {
        if (data && data.cswUrl) {
          setRasterConfig(data);

          // Configure OSM base map default visibility from config
          if (data.defaultMap?.useOsm !== undefined) {
            setShowOsmBase(Boolean(data.defaultMap.useOsm));
          }

          // If defaultMap specifies a MapColonies layer (productId / productType), query CSW and load it
          if (data.defaultMap?.productId) {
            try {
              const queryResult = await fetchRasterRecords({
                cswUrl: data.cswUrl,
                token: data.token,
                productId: data.defaultMap.productId,
                productType: data.defaultMap.productType || undefined,
                maxRecords: 1,
              });

              if (queryResult.records.length > 0) {
                const defaultRecord = queryResult.records[0];
                const activeLayer = await createWMTSLayerFromRecord({
                  record: defaultRecord,
                  token: data.token,
                  zIndex: 1,
                  opacity: 1.0,
                });

                if (mapRef.current) {
                  mapRef.current.addLayer(activeLayer.olLayer);
                  setActiveRasterLayers([activeLayer]);

                  // If bbox exists, center on the default map layer
                  if (activeLayer.extent) {
                    mapRef.current.getView().fit(activeLayer.extent, {
                      padding: [50, 50, 50, 50],
                      maxZoom: 14,
                      duration: 500,
                    });
                  }
                }
              } else {
                console.warn(`Default map with productId "${data.defaultMap.productId}" not found in CSW catalog.`);
              }
            } catch (err) {
              console.error('Failed to auto-load configured default MapColonies raster layer:', err);
            }
          }
        }
      })
      .catch((err) => console.warn('Could not fetch raster config from BFF:', err));
  }, []);

  // Sync OSM Base Layer visibility
  useEffect(() => {
    if (osmLayerRef.current) {
      osmLayerRef.current.setVisible(showOsmBase);
    }
  }, [showOsmBase]);

  // Sync Debug Tile Scheme Layer visibility
  useEffect(() => {
    if (debugLayerRef.current) {
      debugLayerRef.current.setVisible(showDebugLayer);
    }
  }, [showDebugLayer]);

  useEffect(() => {
    setDrawingInteraction(drawMode);
  }, [drawMode, setDrawingInteraction]);

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;

    const initialView = new View({
      center: fromLonLat([34.7818, 32.0853]),
      zoom: 7,
      maxZoom: 19,
      minZoom: 2,
    });

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      style: vectorStyle,
      zIndex: 100, // Always on top of all raster layers
    });

    const debugLayer = new TileLayer({
      source: new TileDebug(),
      visible: showDebugLayer,
      zIndex: 50,
    });
    debugLayerRef.current = debugLayer;

    const osmLayer = new TileLayer({
      source: new OSM(),
      zIndex: 0,
      visible: showOsmBase,
    });
    osmLayerRef.current = osmLayer;

    const map = new Map({
      target: mapElement.current,
      layers: [
        osmLayer,
        debugLayer,
        vectorLayer,
      ],
      view: initialView,
      controls: defaultControls({ zoom: false, rotate: false }),
    });

    map.on('pointermove', (evt) => {
      if (evt.coordinate) {
        const lonLat = toLonLat(evt.coordinate);
        setCoordinates({
          lon: lonLat[0].toFixed(8),
          lat: lonLat[1].toFixed(8),
        });
      }
    });

    map.on('moveend', () => {
      const view = map.getView();
      const currentZoom = view.getZoom();
      if (currentZoom !== undefined) {
        setZoomLevel(Math.round(currentZoom));
      }
    });

    mapRef.current = map;
    if (onMapReady) {
      onMapReady(map);
    }

    const resizeObserver = new ResizeObserver(() => {
      map.updateSize();
    });
    resizeObserver.observe(mapElement.current);

    return () => {
      resizeObserver.disconnect();
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  // Handler: Add raster layer to map
  const handleAddRasterLayer = async (record: RasterRecord) => {
    const map = mapRef.current;
    if (!map) {
      console.error('Map is not initialized yet');
      throw new Error('Map is not initialized');
    }

    // Check if layer already exists
    if (activeRasterLayers.some((l) => l.id === record.id)) return;

    try {
      const zIndex = activeRasterLayers.length + 1;
      const activeLayer = await createWMTSLayerFromRecord({
        record,
        token: rasterConfig?.token,
        zIndex,
        opacity: 1.0,
      });

      map.addLayer(activeLayer.olLayer);
      setActiveRasterLayers((prev) => [activeLayer, ...prev]);
    } catch (err: any) {
      console.error(`Error adding raster layer "${record.productName}":`, err);
      throw err;
    }
  };

  // Handler: Remove raster layer from map
  const handleRemoveRasterLayer = (layerId: string) => {
    const map = mapRef.current;
    const target = activeRasterLayers.find((l) => l.id === layerId);
    if (map && target?.olLayer) {
      map.removeLayer(target.olLayer);
    }
    setActiveRasterLayers((prev) => prev.filter((l) => l.id !== layerId));
  };

  // Handler: Update raster layer opacity
  const handleUpdateLayerOpacity = (layerId: string, opacity: number) => {
    setActiveRasterLayers((prev) =>
      prev.map((l) => {
        if (l.id === layerId) {
          if (l.olLayer) {
            l.olLayer.setOpacity(opacity);
          }
          return { ...l, opacity };
        }
        return l;
      })
    );
  };

  // Handler: Toggle raster layer visibility
  const handleToggleLayerVisibility = (layerId: string) => {
    setActiveRasterLayers((prev) =>
      prev.map((l) => {
        if (l.id === layerId) {
          const nextVis = !l.visible;
          if (l.olLayer) {
            l.olLayer.setVisible(nextVis);
          }
          return { ...l, visible: nextVis };
        }
        return l;
      })
    );
  };

  // Handler: Reorder raster layers (update zIndex)
  const handleReorderLayers = (newLayers: ActiveRasterLayer[]) => {
    newLayers.forEach((layer) => {
      if (layer.olLayer) {
        layer.olLayer.setZIndex(layer.zIndex);
      }
    });
    setActiveRasterLayers(newLayers);
  };

  // Handler: Zoom map to raster layer bounds
  const handleZoomToLayer = (layer: ActiveRasterLayer | RasterRecord) => {
    const map = mapRef.current;
    if (!map) return;

    let extent3857: [number, number, number, number] | undefined = undefined;

    if ('extent' in layer && layer.extent) {
      extent3857 = layer.extent;
    } else if ('bbox' in layer && layer.bbox) {
      try {
        extent3857 = transformExtent(layer.bbox, 'EPSG:4326', 'EPSG:3857') as [number, number, number, number];
      } catch (e) {
        console.warn('Failed to transform bbox to 3857:', e);
      }
    }

    if (extent3857 && !extent3857.some(isNaN) && extent3857[0] !== Infinity) {
      map.getView().fit(extent3857, {
        padding: [60, 60, 60, 60],
        maxZoom: 16,
        duration: 500,
      });
    }
  };

  const handleClearArea = () => {
    vectorSourceRef.current.clear();
    setHasDrawnGeometry(false);
    onAreaSelected?.(null);
  };

  const handleZoomIn = () => {
    const map = mapRef.current;
    if (!map) return;
    const view = map.getView();
    view.animate({ zoom: (view.getZoom() || 7) + 1, duration: 250 });
  };

  const handleZoomOut = () => {
    const map = mapRef.current;
    if (!map) return;
    const view = map.getView();
    view.animate({ zoom: (view.getZoom() || 7) - 1, duration: 250 });
  };

  const handleResetView = () => {
    const map = mapRef.current;
    if (!map) return;
    map.getView().animate({
      center: fromLonLat([34.7818, 32.0853]),
      zoom: 7,
      duration: 500,
    });
  };

  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      mapElement.current?.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Map DOM Container */}
      <div
        ref={mapElement}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          background: '#1c242c',
        }}
      />

      {/* Map Drawing Controls (Top Left) */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          alignItems: 'center',
          p: 0.5,
          bgcolor: 'rgba(26, 34, 40, 0.9)',
          backdropFilter: 'blur(4px)',
          border: '1px solid',
          borderColor: 'divider',
          zIndex: 10,
        }}
      >
        <ToggleButtonGroup
          size="small"
          value={drawMode}
          exclusive
          onChange={(_, newMode) => {
            if (newMode !== null) {
              setDrawMode(newMode);
            }
          }}
          aria-label="map drawing tools"
        >
          <ToggleButton value="none" aria-label="pan map">
            <Tooltip title="Pan Map (Navigate)">
              <PanToolIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="bbox" aria-label="draw bounding box">
            <Tooltip title="Draw Bounding Box (Drag)">
              <CropSquareIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="polygon" aria-label="draw polygon">
            <Tooltip title="Draw Polygon">
              <PolylineIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.8 }} />

        <Tooltip title="Clear Drawn Area">
          <span>
            <IconButton
              size="small"
              color="error"
              onClick={handleClearArea}
              disabled={!hasDrawnGeometry}
              sx={{ p: 0.8 }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Paper>

      {/* Floating Layer Manager (Top Left beside draw toolbar) */}
      <LayerManager
        showOsmBase={showOsmBase}
        onToggleOsmBase={setShowOsmBase}
        activeLayers={activeRasterLayers}
        onReorderLayers={handleReorderLayers}
        onUpdateLayerOpacity={handleUpdateLayerOpacity}
        onToggleLayerVisibility={handleToggleLayerVisibility}
        onRemoveLayer={handleRemoveRasterLayer}
        onZoomToLayer={handleZoomToLayer}
        onOpenCatalog={() => setCatalogDrawerOpen(true)}
      />

      {/* Navigation Toolbar (Top Right) */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'rgba(26, 34, 40, 0.9)',
          backdropFilter: 'blur(4px)',
          border: '1px solid',
          borderColor: 'divider',
          zIndex: 10,
        }}
      >
        <ButtonGroup orientation="vertical" size="small" variant="text">
          <Tooltip title="Open MapColonies Raster Catalog" placement="left">
            <IconButton
              onClick={() => setCatalogDrawerOpen(true)}
              size="small"
              color={activeRasterLayers.length > 0 ? "secondary" : "primary"}
            >
              <CollectionsBookmarkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={showDebugLayer ? "Hide Tile Scheme (Debug Grid)" : "Show Tile Scheme (Debug Grid)"} placement="left">
            <IconButton
              onClick={() => setShowDebugLayer((prev) => !prev)}
              size="small"
              color={showDebugLayer ? "warning" : "primary"}
            >
              {showDebugLayer ? <GridOnIcon fontSize="small" /> : <GridOffIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom In" placement="left">
            <IconButton onClick={handleZoomIn} size="small" color="primary">
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out" placement="left">
            <IconButton onClick={handleZoomOut} size="small" color="primary">
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset View" placement="left">
            <IconButton onClick={handleResetView} size="small">
              <CenterFocusStrongIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Toggle Fullscreen" placement="left">
            <IconButton onClick={handleFullScreen} size="small">
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </ButtonGroup>
      </Paper>

      {/* Raster Catalog Drawer */}
      <RasterCatalogDrawer
        open={catalogDrawerOpen}
        onClose={() => setCatalogDrawerOpen(false)}
        rasterConfig={rasterConfig}
        activeLayers={activeRasterLayers}
        onAddLayer={handleAddRasterLayer}
        onRemoveLayer={handleRemoveRasterLayer}
        onZoomToLayerExtent={handleZoomToLayer}
      />

      {/* Bottom Coordinates & Mode Info */}
      <Paper
        elevation={2}
        sx={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          px: 1.5,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: 'rgba(26, 34, 40, 0.85)',
          backdropFilter: 'blur(4px)',
          border: '1px solid',
          borderColor: 'divider',
          zIndex: 10,
        }}
      >
        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
          Lon: <strong style={{ color: '#fff' }}>{coordinates.lon}°</strong> | Lat: <strong style={{ color: '#fff' }}>{coordinates.lat}°</strong>
        </Typography>
        <Chip label={`Zoom: ${zoomLevel}`} size="small" variant="outlined" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
        {showDebugLayer && (
          <Chip
            label="Grid Scheme (Z/X/Y)"
            size="small"
            color="warning"
            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
          />
        )}
        {drawMode !== 'none' && (
          <Chip
            label={`Mode: ${drawMode.toUpperCase()}`}
            size="small"
            color="secondary"
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        )}
      </Paper>
    </Box>
  );
};
