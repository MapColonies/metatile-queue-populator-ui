import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CalculateIcon from "@mui/icons-material/Calculate";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import axios from "axios";
import { SelectedArea } from "../types/geometry.ts";
import { appConfig } from "../config/appConfig.ts";

interface ZoomEstimation {
  zoom: number;
  metatiles: number;
  tiles: number;
}

interface EstimationResult {
  totalMetatiles: number;
  totalTiles: number;
  metatileSize: number;
  breakdown: ZoomEstimation[];
}

interface TileEstimationWidgetProps {
  selectedArea: SelectedArea;
  zoomRange: [number, number];
}

const HIGH_TILE_THRESHOLD = 500000; // Warning threshold

export const TileEstimationWidget: React.FC<TileEstimationWidgetProps> = ({
  selectedArea,
  zoomRange,
}) => {
  const [estimation, setEstimation] = useState<EstimationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedArea) {
      setEstimation(null);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const payload: any = {
          minZoom: zoomRange[0],
          maxZoom: zoomRange[1],
          metatile: appConfig.defaultMetatile,
          area:
            selectedArea.type === "bbox"
              ? selectedArea.bbox
              : selectedArea.geojson,
        };

        const response = await axios.post<EstimationResult>(
          "/api/tiles/estimate",
          payload,
        );
        setEstimation(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Calculation failed");
      } finally {
        setLoading(false);
      }
    }, 250); // Debounce 250ms

    return () => clearTimeout(timer);
  }, [selectedArea, zoomRange]);

  if (!selectedArea) {
    return null;
  }

  return (
    <Box
      sx={{
        p: 1.5,
        bgcolor: "rgba(0, 163, 224, 0.05)",
        border: "1px solid",
        borderColor: "primary.dark",
        borderRadius: 1.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CalculateIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Estimated Volume
          </Typography>
        </Box>
        {loading && <CircularProgress size={16} color="primary" />}
      </Box>

      {error ? (
        <Alert severity="warning" sx={{ mt: 1, py: 0.2, fontSize: "0.75rem" }}>
          {error}
        </Alert>
      ) : estimation ? (
        <Box sx={{ mt: 1 }}>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Chip
              label={`${estimation.totalMetatiles.toLocaleString()} Metatiles (${estimation.metatileSize}x${estimation.metatileSize})`}
              size="small"
              color="primary"
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label={`~${estimation.totalTiles.toLocaleString()} Tiles`}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>

          {estimation.totalTiles > HIGH_TILE_THRESHOLD && (
            <Alert
              icon={<WarningAmberIcon fontSize="inherit" />}
              severity="warning"
              sx={{ mt: 1, py: 0.2, fontSize: "0.75rem" }}
            >
              Large generation volume (&gt;500k tiles). May take longer to
              complete.
            </Alert>
          )}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mt: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Zoom Breakdown (Z{zoomRange[0]} - Z{zoomRange[1]})
            </Typography>
            <IconButton
              size="small"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? (
                <ExpandLessIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </IconButton>
          </Box>

          <Collapse in={expanded}>
            <TableContainer
              sx={{
                maxHeight: 150,
                mt: 0.5,
                bgcolor: "background.paper",
                borderRadius: 1,
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: "0.7rem", py: 0.5 }}>
                      Zoom
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontSize: "0.7rem", py: 0.5 }}
                    >
                      Metatiles
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontSize: "0.7rem", py: 0.5 }}
                    >
                      Standard Tiles
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {estimation.breakdown.map((row) => (
                    <TableRow key={row.zoom}>
                      <TableCell
                        sx={{ fontSize: "0.7rem", py: 0.4, fontWeight: 600 }}
                      >
                        Z{row.zoom}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontSize: "0.7rem", py: 0.4 }}
                      >
                        {row.metatiles.toLocaleString()}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontSize: "0.7rem",
                          py: 0.4,
                          color: "text.secondary",
                        }}
                      >
                        {row.tiles.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Collapse>
        </Box>
      ) : (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.5 }}
        >
          Calculating tile estimation...
        </Typography>
      )}
    </Box>
  );
};
