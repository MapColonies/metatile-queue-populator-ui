import React, { useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { SelectedArea } from "../types/geometry.ts";

interface SpatialDropzoneProps {
  onGeometryLoaded: (area: SelectedArea) => void;
}

export const SpatialDropzone: React.FC<SpatialDropzoneProps> = ({
  onGeometryLoaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successFilename, setSuccessFilename] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [textDialogOpen, setTextDialogOpen] = useState<boolean>(false);
  const [rawSpatialText, setRawSpatialText] = useState<string>("");

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccessFilename(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("/api/spatial/convert", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const featureCollection = response.data;
      if (
        !featureCollection ||
        !featureCollection.features ||
        featureCollection.features.length === 0
      ) {
        throw new Error("No valid geometry features found in uploaded file.");
      }

      onGeometryLoaded({
        type: "geojson",
        geojson:
          featureCollection.features.length === 1
            ? featureCollection.features[0]
            : featureCollection,
      });

      setSuccessFilename(
        `${file.name} (${featureCollection.features.length} features)`,
      );
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to parse file",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTextConvert = async () => {
    if (!rawSpatialText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post("/api/spatial/convert", {
        text: rawSpatialText.trim(),
      });

      const featureCollection = response.data;
      if (
        !featureCollection ||
        !featureCollection.features ||
        featureCollection.features.length === 0
      ) {
        throw new Error("No valid geometry features found in text.");
      }

      onGeometryLoaded({
        type: "geojson",
        geojson:
          featureCollection.features.length === 1
            ? featureCollection.features[0]
            : featureCollection,
      });

      setTextDialogOpen(false);
      setRawSpatialText("");
      setSuccessFilename(
        `Pasted Geometry (${featureCollection.features.length} features)`,
      );
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to parse raw text geometry",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept=".geojson,.json,.kml,.zip,.wkt,.txt"
      />

      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        sx={{
          p: 1.5,
          border: "1.5px dashed",
          borderColor: isDragging ? "primary.main" : "divider",
          borderRadius: 1.5,
          bgcolor: isDragging
            ? "rgba(0, 163, 224, 0.08)"
            : "rgba(0, 0, 0, 0.15)",
          cursor: "pointer",
          transition: "all 0.2s ease",
          textAlign: "center",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: "rgba(0, 163, 224, 0.04)",
          },
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              py: 0.5,
            }}
          >
            <CircularProgress size={18} color="primary" />
            <Typography variant="caption">
              Parsing & Reprojecting to WGS84...
            </Typography>
          </Box>
        ) : (
          <Box>
            <UploadFileIcon color="primary" fontSize="small" />
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, fontSize: "0.8rem" }}
            >
              Drop Shapefile (.zip), KML, WKT, or GeoJSON
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              or click to browse from device
            </Typography>
          </Box>
        )}
      </Box>

      {/* Raw Text WKT / KML button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
        <Button
          size="small"
          variant="text"
          startIcon={<TextSnippetIcon fontSize="inherit" />}
          onClick={(e) => {
            e.stopPropagation();
            setTextDialogOpen(true);
          }}
          sx={{ fontSize: "0.75rem", py: 0.2 }}
        >
          Paste WKT / KML / GeoJSON
        </Button>
      </Box>

      {/* Success Notification */}
      {successFilename && (
        <Alert
          severity="success"
          sx={{ mt: 1, py: 0.2, fontSize: "0.75rem" }}
          action={
            <IconButton
              size="small"
              color="inherit"
              onClick={() => setSuccessFilename(null)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          Loaded: <strong>{successFilename}</strong>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{ mt: 1, py: 0.2, fontSize: "0.75rem" }}
          action={
            <IconButton
              size="small"
              color="inherit"
              onClick={() => setError(null)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {/* Paste Dialog */}
      <Dialog
        open={textDialogOpen}
        onClose={() => setTextDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Paste Spatial Coordinates or Markup</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Paste raw WKT (e.g. <code>POLYGON((...))</code>), KML markup, or
            GeoJSON:
          </Typography>
          <TextField
            multiline
            rows={8}
            fullWidth
            placeholder="POLYGON((34.0 31.0, 35.0 31.0, 35.0 32.0, 34.0 32.0, 34.0 31.0))"
            value={rawSpatialText}
            onChange={(e) => setRawSpatialText(e.target.value)}
            sx={{ fontFamily: "monospace" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTextDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleTextConvert}
            disabled={!rawSpatialText.trim() || loading}
          >
            Convert & Fit Map
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
