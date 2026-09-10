import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  ButtonGroup,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
} from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import PolylineIcon from "@mui/icons-material/Polyline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PanToolIcon from "@mui/icons-material/PanTool";
import GridOnIcon from "@mui/icons-material/GridOn";
import GridOffIcon from "@mui/icons-material/GridOff";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CodeIcon from "@mui/icons-material/Code";
import MapIcon from "@mui/icons-material/Map";
import DescriptionIcon from "@mui/icons-material/Description";

import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import TileDebug from "ol/source/TileDebug";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Draw, { createBox } from "ol/interaction/Draw";
import GeoJSON from "ol/format/GeoJSON";
import WKT from "ol/format/WKT";
import KML from "ol/format/KML";
import Feature from "ol/Feature";
import { Style, Fill, Stroke } from "ol/style";
import { fromLonLat, toLonLat, transformExtent } from "ol/proj";
import { defaults as defaultControls } from "ol/control";
import { DrawMode, SelectedArea } from "../types/geometry.ts";
import {
  ActiveRasterLayer,
  RasterConfig,
  RasterRecord,
} from "../types/raster.ts";
import { createWMTSLayerFromRecord } from "../services/wmtsHelper.ts";
import { fetchRasterRecords } from "../services/cswClient.ts";
import { LayerManager } from "./LayerManager.tsx";
import { RasterCatalogDrawer } from "./RasterCatalogDrawer.tsx";
import "ol/ol.css";

interface MapComponentProps {
  externalArea?: SelectedArea;
  onAreaSelected?: (area: SelectedArea) => void;
  onMapReady?: (map: Map) => void;
}

interface ContextMenuState {
  mouseX: number;
  mouseY: number;
  feature: Feature;
}

const vectorStyle = new Style({
  fill: new Fill({
    color: "rgba(0, 163, 224, 0.25)", // Primary accent translucent
  }),
  stroke: new Stroke({
    color: "#00a3e0",
    width: 2.5,
  }),
});

const hoverStyle = new Style({
  fill: new Fill({
    color: "rgba(0, 163, 224, 0.45)", // Brighter fill on hover
  }),
  stroke: new Stroke({
    color: "#33c2ff",
    width: 3.5,
  }),
});

export const MapComponent: React.FC<MapComponentProps> = ({
  externalArea,
  onAreaSelected,
  onMapReady,
}) => {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource>(new VectorSource());
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const hoveredFeatureRef = useRef<Feature | null>(null);
  const osmLayerRef = useRef<TileLayer<OSM> | null>(null);
  const debugLayerRef = useRef<TileLayer<TileDebug> | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);

  const [drawMode, setDrawMode] = useState<DrawMode>("none");
  const [showDebugLayer, setShowDebugLayer] = useState<boolean>(false);
  const [showOsmBase, setShowOsmBase] = useState<boolean>(true);
  const [activeRasterLayers, setActiveRasterLayers] = useState<
    ActiveRasterLayer[]
  >([]);
  const [catalogDrawerOpen, setCatalogDrawerOpen] = useState<boolean>(false);
  const [rasterConfig, setRasterConfig] = useState<RasterConfig | null>(null);
  const [coordinates, setCoordinates] = useState<{ lon: string; lat: string }>({
    lon: "0.00000000",
    lat: "0.00000000",
  });
  const [zoomLevel, setZoomLevel] = useState<number>(7);
  const [hasDrawnGeometry, setHasDrawnGeometry] = useState<boolean>(false);

  // Right-click Context Menu & Copy notification
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

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
      if (externalArea.type === "geojson") {
        const raw = externalArea.geojson;
        if (raw) {
          if (raw.type === "FeatureCollection") {
            features = geojsonFormat.readFeatures(raw, {
              featureProjection: "EPSG:3857",
              dataProjection: "EPSG:4326",
            });
          } else if (raw.type === "Feature") {
            features = [
              geojsonFormat.readFeature(raw, {
                featureProjection: "EPSG:3857",
                dataProjection: "EPSG:4326",
              }),
            ];
          } else {
            // Raw Geometry
            features = [
              geojsonFormat.readFeature(
                { type: "Feature", properties: {}, geometry: raw },
                {
                  featureProjection: "EPSG:3857",
                  dataProjection: "EPSG:4326",
                },
              ),
            ];
          }
        }
      } else if (externalArea.type === "bbox" && externalArea.bbox) {
        const b = externalArea.bbox;
        const feature = new Feature({
          geometry: new GeoJSON().readGeometry(
            {
              type: "Polygon",
              coordinates: [
                [
                  [b[0], b[1]],
                  [b[2], b[1]],
                  [b[2], b[3]],
                  [b[0], b[3]],
                  [b[0], b[1]],
                ],
              ],
            },
            {
              featureProjection: "EPSG:3857",
              dataProjection: "EPSG:4326",
            },
          ),
        });
        features = [feature];
      }
    } catch (err) {
      console.error("Failed to parse loaded geometry for OpenLayers:", err);
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
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    });
    if (
      !geojsonObject.properties ||
      typeof geojsonObject.properties !== "object"
    ) {
      geojsonObject.properties = {};
    }

    if (drawMode === "bbox") {
      const extent = geometry.getExtent();
      const minPoint = toLonLat([extent[0], extent[1]]);
      const maxPoint = toLonLat([extent[2], extent[3]]);
      const bbox: [number, number, number, number] = [
        Number(minPoint[0].toFixed(6)),
        Number(minPoint[1].toFixed(6)),
        Number(maxPoint[0].toFixed(6)),
        Number(maxPoint[1].toFixed(6)),
      ];
      onAreaSelected?.({ type: "bbox", bbox });
    } else {
      onAreaSelected?.({ type: "geojson", geojson: geojsonObject });
    }
  }, [drawMode, onAreaSelected]);

  // Handle active drawing interaction
  const setDrawingInteraction = useCallback(
    (mode: DrawMode) => {
      const map = mapRef.current;
      if (!map) return;

      if (drawInteractionRef.current) {
        map.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }

      if (mode === "none") {
        return;
      }

      const draw = new Draw({
        source: vectorSourceRef.current,
        type: mode === "bbox" ? "Circle" : "Polygon",
        geometryFunction: mode === "bbox" ? createBox() : undefined,
      });

      draw.on("drawstart", () => {
        // Clear previous feature so only one active area exists
        vectorSourceRef.current.clear();
      });

      draw.on("drawend", () => {
        setTimeout(() => {
          updateDrawnArea();
        }, 50);
      });

      map.addInteraction(draw);
      drawInteractionRef.current = draw;
    },
    [updateDrawnArea],
  );

  // Fetch raster configuration from BFF and handle default map settings
  useEffect(() => {
    fetch("/api/config/raster")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(async (config: RasterConfig) => {
        setRasterConfig(config);

        // Check configured default map preference
        if (config.defaultMap) {
          const { useOsm, productId, productType } = config.defaultMap;

          // Configure OSM visibility
          if (useOsm !== undefined) {
            setShowOsmBase(useOsm);
          }

          // If a custom default MapColonies raster is specified, search and load it
          if (productId && productType) {
            try {
              const queryResult = await fetchRasterRecords({
                cswUrl: config.cswUrl,
                token: config.token,
                startPosition: 1,
                maxRecords: 100,
              });
              const targetRecord = queryResult.records.find(
                (r: RasterRecord) =>
                  r.productId?.toLowerCase() === productId.toLowerCase() &&
                  r.productType?.toLowerCase() === productType.toLowerCase(),
              );

              if (targetRecord && mapRef.current) {
                // Initialize default custom raster layer
                const layer = await createWMTSLayerFromRecord({
                  record: targetRecord,
                  token: config.token,
                  zIndex: 1,
                  opacity: 1.0,
                });
                mapRef.current.addLayer(layer.olLayer);
                setActiveRasterLayers([layer]);
              }
            } catch (err) {
              console.warn(
                "Failed to load configured default MapColonies raster layer:",
                err,
              );
            }
          }
        }
      })
      .catch((err) =>
        console.warn("Could not fetch raster config from BFF:", err),
      );
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

  // Initialize Map
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
    vectorLayerRef.current = vectorLayer;

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
      layers: [osmLayer, debugLayer, vectorLayer],
      view: initialView,
      controls: defaultControls({ zoom: false, rotate: false }),
    });

    // Hover effect & coordinate tracking
    map.on("pointermove", (evt) => {
      if (evt.dragging) return;

      if (evt.coordinate) {
        const lonLat = toLonLat(evt.coordinate);
        setCoordinates({
          lon: lonLat[0].toFixed(8),
          lat: lonLat[1].toFixed(8),
        });
      }

      // Check for hovered feature on vector layer
      const pixel = map.getEventPixel(evt.originalEvent);
      const hitFeature = map.forEachFeatureAtPixel(pixel, (feat, layer) => {
        if (layer === vectorLayerRef.current) {
          return feat as Feature;
        }
        return undefined;
      });

      const targetElement = mapElement.current;

      if (hitFeature) {
        if (targetElement) {
          targetElement.style.cursor = "context-menu";
        }
        if (hoveredFeatureRef.current !== hitFeature) {
          if (hoveredFeatureRef.current) {
            hoveredFeatureRef.current.setStyle(undefined);
          }
          hitFeature.setStyle(hoverStyle);
          hoveredFeatureRef.current = hitFeature;
        }
      } else {
        if (targetElement) {
          targetElement.style.cursor = "";
        }
        if (hoveredFeatureRef.current) {
          hoveredFeatureRef.current.setStyle(undefined);
          hoveredFeatureRef.current = null;
        }
      }
    });

    map.on("moveend", () => {
      const view = map.getView();
      const currentZoom = view.getZoom();
      if (currentZoom !== undefined) {
        setZoomLevel(Math.round(currentZoom));
      }
    });

    // Handle Right-Click (contextmenu) on Map Features
    const viewport = map.getViewport();
    const handleContextMenu = (e: MouseEvent) => {
      const pixel = map.getEventPixel(e);
      let hitFeature: Feature | null = null;

      map.forEachFeatureAtPixel(pixel, (feat, layer) => {
        if (layer === vectorLayerRef.current) {
          hitFeature = feat as Feature;
          return true; // Stop iteration
        }
        return false;
      });

      if (hitFeature) {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
          mouseX: e.clientX,
          mouseY: e.clientY,
          feature: hitFeature,
        });
      } else {
        setContextMenu(null);
      }
    };

    if (viewport) {
      viewport.addEventListener("contextmenu", handleContextMenu);
    }

    mapRef.current = map;
    if (onMapReady) {
      onMapReady(map);
    }

    const resizeObserver = new ResizeObserver(() => {
      map.updateSize();
    });
    resizeObserver.observe(mapElement.current);

    return () => {
      if (viewport) {
        viewport.removeEventListener("contextmenu", handleContextMenu);
      }
      resizeObserver.disconnect();
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  // Copy formatting handlers
  const handleCopy = async (format: "wkt" | "geojson" | "kml") => {
    if (!contextMenu?.feature) {
      setContextMenu(null);
      return;
    }

    const feat = contextMenu.feature;
    let textToCopy = "";

    try {
      if (format === "geojson") {
        const geojsonFormat = new GeoJSON();
        const obj = geojsonFormat.writeFeatureObject(feat, {
          featureProjection: "EPSG:3857",
          dataProjection: "EPSG:4326",
        });
        if (!obj.properties || typeof obj.properties !== "object") {
          obj.properties = {};
        }
        textToCopy = JSON.stringify(obj, null, 2);
      } else if (format === "wkt") {
        const wktFormat = new WKT();
        textToCopy = wktFormat.writeFeature(feat, {
          featureProjection: "EPSG:3857",
          dataProjection: "EPSG:4326",
        });
      } else if (format === "kml") {
        const kmlFormat = new KML({ extractStyles: false });
        textToCopy = kmlFormat.writeFeatures([feat], {
          featureProjection: "EPSG:3857",
          dataProjection: "EPSG:4326",
        });
      }

      await navigator.clipboard.writeText(textToCopy);
      setSnackbarMessage(
        `Copied geometry to clipboard as ${format.toUpperCase()}!`,
      );
    } catch (err: any) {
      console.error(`Failed to copy geometry as ${format}:`, err);
      // Fallback for older browsers
      try {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setSnackbarMessage(
          `Copied geometry to clipboard as ${format.toUpperCase()}!`,
        );
      } catch {
        setSnackbarMessage(`Failed to copy geometry to clipboard.`);
      }
    } finally {
      setContextMenu(null);
    }
  };

  // Handler: Add raster layer to map
  const handleAddRasterLayer = async (record: RasterRecord) => {
    const map = mapRef.current;
    if (!map) {
      console.error("Map is not initialized yet");
      throw new Error("Map is not initialized");
    }

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
      }),
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
      }),
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

    if ("extent" in layer && layer.extent) {
      extent3857 = layer.extent;
    } else if ("bbox" in layer && layer.bbox) {
      try {
        extent3857 = transformExtent(layer.bbox, "EPSG:4326", "EPSG:3857") as [
          number,
          number,
          number,
          number,
        ];
      } catch (e) {
        console.warn("Failed to transform bbox to 3857:", e);
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
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Map DOM Container */}
      <div
        ref={mapElement}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          background: "#1c242c",
        }}
      />

      {/* Map Drawing Controls (Top Left) */}
      <Paper
        elevation={3}
        sx={{
          position: "absolute",
          top: 16,
          left: 16,
          display: "flex",
          alignItems: "center",
          p: 0.5,
          bgcolor: "rgba(26, 34, 40, 0.9)",
          backdropFilter: "blur(4px)",
          border: "1px solid",
          borderColor: "divider",
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

        {hasDrawnGeometry && (
          <>
            <Box sx={{ mx: 0.5, height: 20, width: 1, bgcolor: "divider" }} />
            <Tooltip title="Clear Boundary">
              <IconButton size="small" onClick={handleClearArea} color="error">
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Paper>

      {/* Layer Manager Widget (Top Left, under toolbar) */}
      <LayerManager
        showOsmBase={showOsmBase}
        onToggleOsmBase={() => setShowOsmBase((prev) => !prev)}
        activeLayers={activeRasterLayers}
        onToggleLayerVisibility={handleToggleLayerVisibility}
        onUpdateLayerOpacity={handleUpdateLayerOpacity}
        onRemoveLayer={handleRemoveRasterLayer}
        onReorderLayers={handleReorderLayers}
        onZoomToLayer={handleZoomToLayer}
        onOpenCatalog={() => setCatalogDrawerOpen(true)}
      />

      {/* Map Control Tools (Top Right) */}
      <Paper
        elevation={3}
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          bgcolor: "rgba(26, 34, 40, 0.9)",
          backdropFilter: "blur(4px)",
          border: "1px solid",
          borderColor: "divider",
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
          <Tooltip
            title={
              showDebugLayer
                ? "Hide Tile Scheme (Debug Grid)"
                : "Show Tile Scheme (Debug Grid)"
            }
            placement="left"
          >
            <IconButton
              onClick={() => setShowDebugLayer((prev) => !prev)}
              size="small"
              color={showDebugLayer ? "warning" : "primary"}
            >
              {showDebugLayer ? (
                <GridOnIcon fontSize="small" />
              ) : (
                <GridOffIcon fontSize="small" />
              )}
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
          position: "absolute",
          bottom: 12,
          left: 12,
          px: 1.5,
          py: 0.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          bgcolor: "rgba(26, 34, 40, 0.85)",
          backdropFilter: "blur(4px)",
          border: "1px solid",
          borderColor: "divider",
          zIndex: 10,
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontFamily: "monospace", color: "text.secondary" }}
        >
          Lon: <strong style={{ color: "#fff" }}>{coordinates.lon}°</strong> |
          Lat: <strong style={{ color: "#fff" }}>{coordinates.lat}°</strong>
        </Typography>
        <Chip
          label={`Zoom: ${zoomLevel}`}
          size="small"
          variant="outlined"
          color="primary"
          sx={{ height: 20, fontSize: "0.7rem" }}
        />
        {showDebugLayer && (
          <Chip
            label="Grid Scheme (Z/X/Y)"
            size="small"
            color="warning"
            sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
          />
        )}
        {drawMode !== "none" && (
          <Chip
            label={`Mode: ${drawMode.toUpperCase()}`}
            size="small"
            color="secondary"
            sx={{ height: 20, fontSize: "0.7rem" }}
          />
        )}
      </Paper>

      {/* Right-Click Feature Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        slotProps={{
          paper: {
            sx: {
              minWidth: 200,
              bgcolor: "background.paper",
              backgroundImage: "none",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: 6,
            },
          },
        }}
      >
        <Box
          sx={{ px: 2, py: 1, display: "flex", alignItems: "center", gap: 1 }}
        >
          <ContentCopyIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Copy Geometry
          </Typography>
        </Box>
        <MenuItem onClick={() => handleCopy("wkt")}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Copy as WKT"
            secondary="Well-Known Text format"
          />
        </MenuItem>
        <MenuItem onClick={() => handleCopy("geojson")}>
          <ListItemIcon>
            <CodeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Copy as GeoJSON"
            secondary="RFC 7946 Standard JSON"
          />
        </MenuItem>
        <MenuItem onClick={() => handleCopy("kml")}>
          <ListItemIcon>
            <MapIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Copy as KML"
            secondary="Keyhole Markup Language"
          />
        </MenuItem>
      </Menu>

      {/* Copy notification feedback */}
      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={3000}
        onClose={() => setSnackbarMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSnackbarMessage(null)}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
