import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip, ButtonGroup, Chip } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromLonLat, toLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import 'ol/ol.css';

interface MapComponentProps {
  vectorSource?: VectorSource;
  onMapReady?: (map: Map) => void;
}

export const MapComponent: React.FC<MapComponentProps> = ({ vectorSource: externalVectorSource, onMapReady }) => {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [coordinates, setCoordinates] = useState<{ lon: string; lat: string }>({ lon: '0.0000', lat: '0.0000' });
  const [zoomLevel, setZoomLevel] = useState<number>(3);

  const localVectorSource = useRef(new VectorSource());
  const activeVectorSource = externalVectorSource ?? localVectorSource.current;

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;

    const initialView = new View({
      center: fromLonLat([34.7818, 32.0853]), // Default center (Israel / Mediterranean region)
      zoom: 7,
      maxZoom: 19,
      minZoom: 2,
    });

    const vectorLayer = new VectorLayer({
      source: activeVectorSource,
    });

    const map = new Map({
      target: mapElement.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer,
      ],
      view: initialView,
      controls: defaultControls({ zoom: false, rotate: false }),
    });

    map.on('pointermove', (evt) => {
      if (evt.coordinate) {
        const lonLat = toLonLat(evt.coordinate);
        setCoordinates({
          lon: lonLat[0].toFixed(4),
          lat: lonLat[1].toFixed(4),
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

  const handleZoomIn = () => {
    const view = mapRef.current?.getView();
    if (view) {
      const zoom = view.getZoom();
      if (zoom !== undefined) view.animate({ zoom: zoom + 1, duration: 250 });
    }
  };

  const handleZoomOut = () => {
    const view = mapRef.current?.getView();
    if (view) {
      const zoom = view.getZoom();
      if (zoom !== undefined) view.animate({ zoom: zoom - 1, duration: 250 });
    }
  };

  const handleResetView = () => {
    const view = mapRef.current?.getView();
    if (view) {
      view.animate({
        center: fromLonLat([34.7818, 32.0853]),
        zoom: 7,
        duration: 400,
      });
    }
  };

  const handleFullScreen = () => {
    if (mapElement.current?.parentElement) {
      if (!document.fullscreenElement) {
        mapElement.current.parentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 1 }}>
      {/* OpenLayers Map Canvas */}
      <div ref={mapElement} style={{ width: '100%', height: '100%', background: '#1c242c' }} />

      {/* Floating Control Toolbar */}
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

      {/* Floating Bottom Coordinates & Zoom Readout */}
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
      </Paper>
    </Box>
  );
};
