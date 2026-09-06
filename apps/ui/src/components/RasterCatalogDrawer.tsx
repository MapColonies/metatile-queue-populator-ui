import React, { useState, useEffect, useCallback } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Pagination,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Divider,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import LayersIcon from "@mui/icons-material/Layers";
import { fetchRasterRecords } from "../services/cswClient.ts";
import {
  ActiveRasterLayer,
  RasterConfig,
  RasterRecord,
} from "../types/raster.ts";

interface RasterCatalogDrawerProps {
  open: boolean;
  onClose: () => void;
  rasterConfig: RasterConfig | null;
  activeLayers: ActiveRasterLayer[];
  onAddLayer: (record: RasterRecord) => Promise<void>;
  onRemoveLayer: (layerId: string) => void;
  onZoomToLayerExtent: (record: RasterRecord) => void;
}

const PRODUCT_TYPES = [
  "ALL",
  "Orthophoto",
  "RasterVector",
  "Elevation",
  "DTM",
  "DSM",
  "Vector",
];

export const RasterCatalogDrawer: React.FC<RasterCatalogDrawerProps> = ({
  open,
  onClose,
  rasterConfig,
  activeLayers,
  onAddLayer,
  onRemoveLayer,
  onZoomToLayerExtent,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedProductType, setSelectedProductType] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const [records, setRecords] = useState<RasterRecord[]>([]);
  const [totalMatched, setTotalMatched] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const loadCatalogRecords = useCallback(
    async (currentPage: number, query: string, type: string) => {
      if (!rasterConfig?.cswUrl) {
        setError("CSW Catalog URL is not configured.");
        return;
      }

      setLoading(true);
      setError(null);

      const startPosition = (currentPage - 1) * pageSize + 1;

      try {
        const result = await fetchRasterRecords({
          cswUrl: rasterConfig.cswUrl,
          token: rasterConfig.token,
          startPosition,
          maxRecords: pageSize,
          queryText: query || undefined,
          productType: type !== "ALL" ? type : undefined,
        });

        setRecords(result.records);
        setTotalMatched(result.totalMatched);
      } catch (err: any) {
        console.error("Failed to load raster records:", err);
        setError(err.message || "Failed to query MapColonies CSW Catalog");
      } finally {
        setLoading(false);
      }
    },
    [rasterConfig],
  );

  useEffect(() => {
    if (open && rasterConfig) {
      loadCatalogRecords(page, searchQuery, selectedProductType);
    }
  }, [open, page, rasterConfig, loadCatalogRecords]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCatalogRecords(1, searchQuery, selectedProductType);
  };

  const handleProductTypeChange = (type: string) => {
    setSelectedProductType(type);
    setPage(1);
    loadCatalogRecords(1, searchQuery, type);
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  const isLayerActive = (recordId: string) => {
    return activeLayers.some((l) => l.id === recordId);
  };

  const handleToggleLayer = async (record: RasterRecord) => {
    console.log(
      "[RasterCatalogDrawer] handleToggleLayer called for:",
      record.productName,
      record.id,
      "is active:",
      isLayerActive(record.id),
    );
    if (isLayerActive(record.id)) {
      onRemoveLayer(record.id);
    } else {
      setAddingId(record.id);
      try {
        await onAddLayer(record);
        console.log(
          "[RasterCatalogDrawer] Successfully added layer:",
          record.productName,
        );
      } catch (err: any) {
        console.error("[RasterCatalogDrawer] Error in onAddLayer:", err);
        setError(`Failed to add layer "${record.productName}": ${err.message}`);
      } finally {
        setAddingId(null);
      }
    }
  };

  const totalPages = Math.ceil(totalMatched / pageSize);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 540, md: 620, lg: 680 },
          bgcolor: "#1a2228",
          p: 0,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 24px rgba(0,0,0,0.5)",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgba(20, 26, 31, 0.98)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LayersIcon color="primary" />
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, fontSize: "1.15rem" }}
          >
            MapColonies Raster Catalog
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Filter & Search Bar */}
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgba(26, 34, 40, 0.95)",
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <form onSubmit={handleSearchSubmit}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search layers by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" type="submit" color="primary">
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </form>

        {/* Product Type Filter Chips */}
        <Box sx={{ display: "flex", gap: 0.8, overflowX: "auto", pb: 0.5 }}>
          {PRODUCT_TYPES.map((type) => (
            <Chip
              key={type}
              label={type}
              size="small"
              clickable
              color={selectedProductType === type ? "primary" : "default"}
              variant={selectedProductType === type ? "filled" : "outlined"}
              onClick={() => handleProductTypeChange(type)}
              sx={{ fontSize: "0.75rem" }}
            />
          ))}
        </Box>

        {/* Total records info */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Found <strong>{totalMatched}</strong> raster layer
            {totalMatched === 1 ? "" : "s"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Page {page} of {totalPages || 1}
          </Typography>
        </Box>
      </Box>

      {/* Main Content List with smooth scrolling */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          "&::-webkit-scrollbar": { width: "8px" },
          "&::-webkit-scrollbar-track": { background: "rgba(0,0,0,0.1)" },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255,255,255,0.2)",
            borderRadius: "4px",
          },
        }}
      >
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 8,
              gap: 2,
            }}
          >
            <CircularProgress size={36} color="primary" />
            <Typography variant="body2" color="text.secondary">
              Querying MapColonies CSW Catalog...
            </Typography>
          </Box>
        ) : records.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8, px: 2 }}>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              No raster records found
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Try adjusting your search query or selected product type.
            </Typography>
          </Box>
        ) : (
          records.map((record) => {
            const active = isLayerActive(record.id);
            const isAdding = addingId === record.id;

            return (
              <Card
                key={record.id}
                variant="outlined"
                sx={{
                  flexShrink: 0,
                  bgcolor: active
                    ? "rgba(0, 163, 224, 0.12)"
                    : "rgba(30, 39, 46, 0.85)",
                  borderColor: active
                    ? "primary.main"
                    : "rgba(255, 255, 255, 0.12)",
                  borderRadius: 2,
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: active
                      ? "primary.light"
                      : "rgba(255, 255, 255, 0.25)",
                    boxShadow: 3,
                  },
                }}
              >
                <CardContent sx={{ p: 2, pb: 1.5 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 1.5,
                    }}
                  >
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          color: "text.primary",
                          fontSize: "0.95rem",
                          wordBreak: "break-word",
                          lineHeight: 1.3,
                        }}
                      >
                        {record.productName}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "primary.light",
                          fontFamily: "monospace",
                          display: "block",
                          wordBreak: "break-all",
                          mt: 0.2,
                        }}
                      >
                        ID: {record.productId}
                      </Typography>
                    </Box>
                    <Chip
                      label={record.productType || "Raster"}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{
                        height: 22,
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    />
                  </Box>

                  {record.description &&
                    record.description !==
                      "undefined undefined undefined undefined" && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 1,
                          fontSize: "0.82rem",
                          lineHeight: 1.4,
                        }}
                      >
                        {record.description}
                      </Typography>
                    )}

                  {/* Metadata Chips */}
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 0.8,
                      mt: 1.5,
                    }}
                  >
                    {record.updateDate && (
                      <Chip
                        label={`Updated: ${new Date(record.updateDate).toLocaleDateString()}`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.7rem",
                          bgcolor: "rgba(255,255,255,0.06)",
                        }}
                      />
                    )}
                    {record.bbox && (
                      <Chip
                        label="Bounds Available"
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ height: 20, fontSize: "0.7rem" }}
                      />
                    )}
                    {record.links.some((l) => l.scheme.includes("WMTS")) && (
                      <Chip
                        label="WMTS Supported"
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ height: 20, fontSize: "0.7rem" }}
                      />
                    )}
                  </Box>
                </CardContent>

                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

                <CardActions
                  sx={{
                    px: 2,
                    py: 1.2,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 1,
                    bgcolor: "rgba(0,0,0,0.15)",
                  }}
                >
                  <Button
                    size="medium"
                    variant={active ? "outlined" : "contained"}
                    color={active ? "error" : "primary"}
                    startIcon={
                      isAdding ? (
                        <CircularProgress size={16} />
                      ) : active ? (
                        <DeleteIcon />
                      ) : (
                        <AddIcon />
                      )
                    }
                    onClick={() => handleToggleLayer(record)}
                    disabled={isAdding}
                    sx={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      px: 2,
                      py: 0.6,
                      minWidth: 140,
                    }}
                  >
                    {active ? "Remove from Map" : "Add to Map"}
                  </Button>

                  {record.bbox && (
                    <Tooltip title="Zoom map to layer boundary">
                      <Button
                        size="small"
                        variant="text"
                        color="info"
                        startIcon={<CenterFocusStrongIcon />}
                        onClick={() => onZoomToLayerExtent(record)}
                        sx={{ fontSize: "0.75rem", fontWeight: 500 }}
                      >
                        Zoom to Bounds
                      </Button>
                    </Tooltip>
                  )}
                </CardActions>
              </Card>
            );
          })
        )}
      </Box>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <Box
          sx={{
            p: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "center",
            bgcolor: "rgba(26, 34, 40, 0.95)",
          }}
        >
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="small"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Drawer>
  );
};
