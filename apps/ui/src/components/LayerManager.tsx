import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Slider,
  Switch,
  List,
  Divider,
  Collapse,
  Badge,
  Button,
} from "@mui/material";
import LayersIcon from "@mui/icons-material/Layers";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import MapIcon from "@mui/icons-material/Map";
import { ActiveRasterLayer } from "../types/raster.ts";

interface LayerManagerProps {
  showOsmBase: boolean;
  onToggleOsmBase: (show: boolean) => void;
  activeLayers: ActiveRasterLayer[];
  onReorderLayers: (newOrder: ActiveRasterLayer[]) => void;
  onUpdateLayerOpacity: (layerId: string, opacity: number) => void;
  onToggleLayerVisibility: (layerId: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onZoomToLayer: (layer: ActiveRasterLayer) => void;
  onOpenCatalog: () => void;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  showOsmBase,
  onToggleOsmBase,
  activeLayers,
  onReorderLayers,
  onUpdateLayerOpacity,
  onToggleLayerVisibility,
  onRemoveLayer,
  onZoomToLayer,
  onOpenCatalog,
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  // Auto-expand when layers are added
  useEffect(() => {
    if (activeLayers.length > 0) {
      setExpanded(true);
    }
  }, [activeLayers.length]);

  const moveLayer = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeLayers.length) return;

    const newLayers = [...activeLayers];
    const temp = newLayers[index];
    newLayers[index] = newLayers[targetIndex];
    newLayers[targetIndex] = temp;

    // Recalculate zIndex (top item in list has highest zIndex)
    const total = newLayers.length;
    const updated = newLayers.map((l, i) => ({
      ...l,
      zIndex: total - i + 1,
    }));

    onReorderLayers(updated);
  };

  return (
    <Paper
      elevation={4}
      sx={{
        position: "absolute",
        top: 16,
        left: 240,
        zIndex: 15,
        bgcolor: "rgba(26, 34, 40, 0.95)",
        backdropFilter: "blur(8px)",
        border: "1px solid",
        borderColor: activeLayers.length > 0 ? "primary.main" : "divider",
        borderRadius: 2,
        maxWidth: 360,
        width: expanded ? 340 : "auto",
        transition: "all 0.2s ease-in-out",
      }}
    >
      {/* Header bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 0.8,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Badge badgeContent={activeLayers.length} color="primary">
            <LayersIcon
              fontSize="small"
              color={activeLayers.length > 0 ? "primary" : "action"}
            />
          </Badge>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, fontSize: "0.85rem" }}
          >
            Map Layers
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Tooltip title={expanded ? "Collapse" : "Expand Layer Manager"}>
            <IconButton size="small" sx={{ p: 0.2 }}>
              {expanded ? (
                <ExpandLessIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Expanded Content Panel */}
      <Collapse in={expanded}>
        <Divider />
        <Box
          sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}
        >
          {/* Base Layer Switch */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "background.paper",
              p: 1,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <MapIcon fontSize="small" color="primary" />
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, fontSize: "0.8rem" }}
                >
                  OpenStreetMap Base
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Default global map
                </Typography>
              </Box>
            </Box>
            <Switch
              size="small"
              checked={showOsmBase}
              onChange={(e) => onToggleOsmBase(e.target.checked)}
            />
          </Box>

          {/* Active Raster Layers Stack */}
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 0.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: "text.secondary",
                  textTransform: "uppercase",
                }}
              >
                Active Raster Layers ({activeLayers.length})
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.disabled", fontSize: "0.68rem" }}
              >
                Top item renders on top
              </Typography>
            </Box>

            {activeLayers.length === 0 ? (
              <Box
                sx={{
                  p: 2,
                  textAlign: "center",
                  bgcolor: "rgba(255, 255, 255, 0.03)",
                  borderRadius: 1,
                  border: "1px dashed",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1 }}
                >
                  No MapColonies raster layers active
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<AddPhotoAlternateIcon />}
                  onClick={onOpenCatalog}
                  sx={{ fontSize: "0.75rem", py: 0.3 }}
                >
                  Browse Catalog
                </Button>
              </Box>
            ) : (
              <List
                dense
                sx={{
                  p: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.8,
                }}
              >
                {activeLayers.map((layer, index) => (
                  <Paper
                    key={layer.id}
                    variant="outlined"
                    sx={{
                      p: 1,
                      bgcolor: "background.paper",
                      borderRadius: 1,
                      borderColor: layer.visible
                        ? "divider"
                        : "rgba(255, 255, 255, 0.05)",
                      opacity: layer.visible ? 1 : 0.6,
                    }}
                  >
                    {/* Layer Header */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          overflow: "hidden",
                          mr: 1,
                        }}
                      >
                        <Tooltip
                          title={layer.visible ? "Hide layer" : "Show layer"}
                        >
                          <IconButton
                            size="small"
                            onClick={() => onToggleLayerVisibility(layer.id)}
                            color={layer.visible ? "primary" : "default"}
                            sx={{ p: 0.2 }}
                          >
                            {layer.visible ? (
                              <VisibilityIcon fontSize="small" />
                            ) : (
                              <VisibilityOffIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {layer.productName}
                        </Typography>
                      </Box>

                      {/* Reorder and Action Buttons */}
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Tooltip title="Move Layer Up (Bring to Front)">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => moveLayer(index, "up")}
                              disabled={index === 0}
                              sx={{ p: 0.2 }}
                            >
                              <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Move Layer Down (Send to Back)">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => moveLayer(index, "down")}
                              disabled={index === activeLayers.length - 1}
                              sx={{ p: 0.2 }}
                            >
                              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Zoom to Layer Bounds">
                          <IconButton
                            size="small"
                            onClick={() => onZoomToLayer(layer)}
                            color="info"
                            sx={{ p: 0.2 }}
                          >
                            <CenterFocusStrongIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove Layer">
                          <IconButton
                            size="small"
                            onClick={() => onRemoveLayer(layer.id)}
                            color="error"
                            sx={{ p: 0.2 }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* Opacity Slider */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        px: 0.5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.7rem",
                          color: "text.secondary",
                          minWidth: 42,
                        }}
                      >
                        Opacity:
                      </Typography>
                      <Slider
                        size="small"
                        value={Math.round(layer.opacity * 100)}
                        min={0}
                        max={100}
                        onChange={(_, val) =>
                          onUpdateLayerOpacity(layer.id, (val as number) / 100)
                        }
                        sx={{ py: 0.5 }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.7rem",
                          fontFamily: "monospace",
                          minWidth: 32,
                          textAlign: "right",
                        }}
                      >
                        {Math.round(layer.opacity * 100)}%
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </List>
            )}
          </Box>

          {/* Bottom Action: Open Catalog */}
          {activeLayers.length > 0 && (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<AddPhotoAlternateIcon />}
              onClick={onOpenCatalog}
              fullWidth
              sx={{ fontSize: "0.75rem", py: 0.4 }}
            >
              Add More Layers
            </Button>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};
