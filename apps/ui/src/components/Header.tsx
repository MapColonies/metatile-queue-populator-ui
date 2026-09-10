import React, { useEffect, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Chip,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import LayersIcon from "@mui/icons-material/Layers";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import axios from "axios";
import { usePopulator } from "../contexts/PopulatorContext";
import { getTargetEmoji, PopulatorTarget } from "../types/discovery";

export const Header: React.FC = () => {
  const [bffConnected, setBffConnected] = useState<boolean | null>(null);
  const { targets, activeTarget, loading, setActiveTargetId, refreshTargets } =
    usePopulator();
  const [refreshing, setRefreshing] = useState(false);

  const checkBffHealth = async () => {
    try {
      await axios.get("/api/config/raster", { timeout: 3000 });
      setBffConnected(true);
    } catch {
      setBffConnected(false);
    }
  };

  useEffect(() => {
    checkBffHealth();
    const interval = setInterval(checkBffHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshTargets();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const renderTargetEmoji = (target: PopulatorTarget) => {
    const emoji =
      target.emoji || getTargetEmoji(target.projectName || target.id);
    return (
      <Box component="span" sx={{ fontSize: "1.15rem", mr: 1, lineHeight: 1 }}>
        {emoji}
      </Box>
    );
  };

  return (
    <AppBar
      position="static"
      elevation={2}
      sx={{
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: 52 }}>
        <LayersIcon sx={{ mr: 1.5, color: "primary.main" }} />
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            mr: 3,
            display: { xs: "none", sm: "block" },
          }}
        >
          Metatile Queue Populator
        </Typography>

        {/* Dynamic Target Switcher */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            bgcolor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid",
            borderColor: "rgba(255, 255, 255, 0.12)",
            borderRadius: 2,
            px: 1.5,
            py: 0.3,
            mr: "auto",
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", mr: 1.5, fontWeight: 600 }}
          >
            TARGET SERVICE:
          </Typography>

          {loading && targets.length === 0 ? (
            <CircularProgress size={16} sx={{ mx: 1 }} />
          ) : (
            <FormControl variant="standard" size="small">
              <Select
                value={activeTarget?.id ?? ""}
                onChange={(e) => setActiveTargetId(e.target.value)}
                disableUnderline
                renderValue={(selectedId) => {
                  const selected =
                    targets.find((t) => t.id === selectedId) || activeTarget;
                  if (!selected) return null;
                  return (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      {renderTargetEmoji(selected)}
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, mr: 1 }}
                      >
                        {selected.name}
                      </Typography>
                      <Chip
                        label={
                          selected.source === "auto"
                            ? "Discovered"
                            : "Configured"
                        }
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.65rem",
                          bgcolor:
                            selected.source === "auto"
                              ? "rgba(56, 189, 248, 0.15)"
                              : "rgba(251, 191, 36, 0.15)",
                          color:
                            selected.source === "auto" ? "#38bdf8" : "#fbbf24",
                        }}
                      />
                    </Box>
                  );
                }}
                sx={{
                  color: "text.primary",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  "& .MuiSelect-select": {
                    display: "flex",
                    alignItems: "center",
                    py: 0.5,
                  },
                }}
              >
                {targets.map((target) => (
                  <MenuItem key={target.id} value={target.id}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      {renderTargetEmoji(target)}
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, mr: 1 }}
                      >
                        {target.name}
                      </Typography>
                      <Chip
                        label={
                          target.source === "auto" ? "Discovered" : "Configured"
                        }
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.65rem",
                          bgcolor:
                            target.source === "auto"
                              ? "rgba(56, 189, 248, 0.15)"
                              : "rgba(251, 191, 36, 0.15)",
                          color:
                            target.source === "auto" ? "#38bdf8" : "#fbbf24",
                        }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Tooltip title="Rescan services in vector-dev">
            <IconButton
              size="small"
              onClick={handleManualRefresh}
              disabled={refreshing}
              sx={{ ml: 1, p: 0.5 }}
            >
              <RefreshIcon
                fontSize="small"
                sx={{
                  animation: refreshing ? "spin 1s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Status Indicators */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {bffConnected === null ? (
            <Chip label="Checking BFF..." size="small" variant="outlined" />
          ) : bffConnected ? (
            <Chip
              icon={<CheckCircleOutlineIcon fontSize="small" />}
              label="BFF Connected"
              color="success"
              size="small"
              variant="outlined"
            />
          ) : (
            <Chip
              icon={<ErrorOutlineIcon fontSize="small" />}
              label="BFF Offline"
              color="error"
              size="small"
              variant="filled"
            />
          )}
          <Chip label="MapColonies" color="primary" size="small" />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
