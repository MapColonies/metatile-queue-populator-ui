import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Switch,
  Alert,
  Snackbar,
  CircularProgress,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import SendIcon from "@mui/icons-material/Send";
import GridViewIcon from "@mui/icons-material/GridView";
import { appConfig } from "../config/appConfig.ts";
import { TargetConfirmationCard } from "./TargetConfirmationCard.tsx";
import { usePopulator } from "../contexts/PopulatorContext.tsx";
import axios from "axios";

export interface TileItem {
  id: string;
  z: number;
  x: number;
  y: number;
  metatile: number;
}

export const TileListForm: React.FC = () => {
  const [tiles, setTiles] = useState<TileItem[]>([
    { id: "1", z: 10, x: 500, y: 300, metatile: appConfig.defaultMetatile },
  ]);
  const [force, setForce] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const { activeTarget } = usePopulator();
  const [pasteDialogOpen, setPasteDialogOpen] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>("");
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const handleAddRow = () => {
    setTiles((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        z: 10,
        x: 0,
        y: 0,
        metatile: appConfig.defaultMetatile,
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (tiles.length <= 1) {
      setToast({
        open: true,
        message: "Must have at least one tile coordinate.",
        severity: "info",
      });
      return;
    }
    setTiles((prev) => prev.filter((t) => t.id !== id));
  };

  const handleTileChange = (
    id: string,
    field: keyof Omit<TileItem, "id">,
    value: string,
  ) => {
    const numValue = parseInt(value, 10);
    setTiles((prev) =>
      prev.map((tile) =>
        tile.id === id
          ? { ...tile, [field]: isNaN(numValue) ? 0 : numValue }
          : tile,
      ),
    );
  };

  const handleParsePaste = () => {
    try {
      const trimmed = pasteText.trim();
      let parsedTiles: TileItem[] = [];

      if (trimmed.startsWith("[")) {
        // JSON format
        const parsedJson = JSON.parse(trimmed) as Array<{
          z: number;
          x: number;
          y: number;
          metatile?: number;
        }>;
        parsedTiles = parsedJson.map((item, index) => ({
          id: `${Date.now()}-${index}`,
          z: Number(item.z) || 0,
          x: Number(item.x) || 0,
          y: Number(item.y) || 0,
          metatile: Number(item.metatile) || appConfig.defaultMetatile,
        }));
      } else {
        // CSV or whitespace format (e.g. z,x,y,metatile or z/x/y)
        const lines = trimmed.split("\n");
        parsedTiles = lines
          .map((line, index) => {
            const cleanLine = line.trim();
            if (!cleanLine) return null;
            const parts = cleanLine.includes("/")
              ? cleanLine.split("/")
              : cleanLine.includes(",")
                ? cleanLine.split(",")
                : cleanLine.split(/\s+/);

            if (parts.length < 3) return null;
            const z = parseInt(parts[0], 10);
            const x = parseInt(parts[1], 10);
            const y = parseInt(parts[2], 10);
            const metatile = parts[3]
              ? parseInt(parts[3], 10)
              : appConfig.defaultMetatile;

            if (isNaN(z) || isNaN(x) || isNaN(y)) return null;
            return {
              id: `${Date.now()}-${index}`,
              z,
              x,
              y,
              metatile: isNaN(metatile) ? appConfig.defaultMetatile : metatile,
            };
          })
          .filter((t): t is TileItem => t !== null);
      }

      if (parsedTiles.length === 0) {
        throw new Error("No valid tile coordinates found in text.");
      }

      setTiles(parsedTiles);
      setPasteDialogOpen(false);
      setPasteText("");
      setToast({
        open: true,
        message: `Successfully loaded ${parsedTiles.length} tile(s).`,
        severity: "success",
      });
    } catch (err: any) {
      setToast({
        open: true,
        message:
          err.message ||
          "Failed to parse paste data. Expected JSON or CSV (z,x,y,metatile).",
        severity: "error",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tiles.length === 0) {
      setToast({
        open: true,
        message: "Must specify at least one tile.",
        severity: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const payload = tiles.map((t) => ({
        z: t.z,
        x: t.x,
        y: t.y,
        metatile: t.metatile,
      }));

      const response = await axios.post("/api/tiles/list", payload, {
        params: { force, target: activeTarget?.id },
      });

      // Record in Submission History
      await axios
        .post("/api/history", {
          type: "list",
          parameters: {
            tiles: payload,
            target: activeTarget?.id,
            targetName: activeTarget?.name,
          },
          status: "SUCCESS",
          responseMessage: response.data.message || "Queued successfully",
        })
        .catch(() => null);

      setToast({
        open: true,
        message:
          response.data.message ||
          `Successfully queued ${tiles.length} metatiles!`,
        severity: "success",
      });
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to submit tile list";

      // Record failure in history
      await axios
        .post("/api/history", {
          type: "list",
          parameters: {
            tiles: tiles.map((t) => ({
              z: t.z,
              x: t.x,
              y: t.y,
              metatile: t.metatile,
            })),
            target: activeTarget?.id,
            targetName: activeTarget?.name,
          },
          status: "FAILED",
          responseMessage: errorMsg,
        })
        .catch(() => null);

      setToast({
        open: true,
        message: errorMsg,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        width: 420,
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
        p: 2.5,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <GridViewIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Queue Specific Tiles
          </Typography>
        </Box>
        <Tooltip title="Bulk Paste CSV or JSON">
          <IconButton
            size="small"
            color="primary"
            onClick={() => setPasteDialogOpen(true)}
          >
            <ContentPasteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Provide precise zoom, x, y coordinates and metatile sizes to populate
        the queue.
      </Typography>

      <Divider sx={{ mb: 2 }} />

      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TableContainer
            sx={{ maxHeight: 280, bgcolor: "rgba(0,0,0,0.2)", borderRadius: 1 }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 65, bgcolor: "background.paper" }}>
                    Z
                  </TableCell>
                  <TableCell sx={{ width: 85, bgcolor: "background.paper" }}>
                    X
                  </TableCell>
                  <TableCell sx={{ width: 85, bgcolor: "background.paper" }}>
                    Y
                  </TableCell>
                  <TableCell sx={{ width: 75, bgcolor: "background.paper" }}>
                    Meta
                  </TableCell>
                  <TableCell
                    sx={{ width: 40, bgcolor: "background.paper", p: 0 }}
                  ></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tiles.map((tile) => (
                  <TableRow key={tile.id}>
                    <TableCell sx={{ p: 0.5 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={tile.z}
                        onChange={(e) =>
                          handleTileChange(tile.id, "z", e.target.value)
                        }
                        inputProps={{ min: 0, max: 18 }}
                      />
                    </TableCell>
                    <TableCell sx={{ p: 0.5 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={tile.x}
                        onChange={(e) =>
                          handleTileChange(tile.id, "x", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell sx={{ p: 0.5 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={tile.y}
                        onChange={(e) =>
                          handleTileChange(tile.id, "y", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell sx={{ p: 0.5 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={tile.metatile}
                        onChange={(e) =>
                          handleTileChange(tile.id, "metatile", e.target.value)
                        }
                        inputProps={{ min: 1 }}
                      />
                    </TableCell>
                    <TableCell sx={{ p: 0.5 }}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveRow(tile.id)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            onClick={handleAddRow}
            sx={{ alignSelf: "flex-start" }}
          >
            Add Coordinate Row
          </Button>

          <FormControlLabel
            control={
              <Switch
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                color="warning"
              />
            }
            label={
              <Typography variant="body2">
                Force queueing (overwrite duplicates)
              </Typography>
            }
          />

          <TargetConfirmationCard />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SendIcon />
              )
            }
            fullWidth
          >
            {loading ? "Submitting Tiles..." : `Queue ${tiles.length} Tile(s)`}
          </Button>
        </Stack>
      </form>

      {/* Bulk Paste Dialog */}
      <Dialog
        open={pasteDialogOpen}
        onClose={() => setPasteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Bulk Paste Tile Coordinates</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Paste CSV format (<code>z,x,y,metatile</code> or <code>z/x/y</code>)
            or JSON array:
          </Typography>
          <TextField
            multiline
            rows={8}
            fullWidth
            placeholder={
              '10,500,300,1\n10,501,300,1\n10/502/300\n\nOr JSON:\n[{"z":10,"x":500,"y":300,"metatile":1}]'
            }
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            sx={{ fontFamily: "monospace" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleParsePaste}>
            Import Coordinates
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};
