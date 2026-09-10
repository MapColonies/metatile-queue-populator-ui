import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { usePopulator } from "../contexts/PopulatorContext";
import { getTargetEmoji, PopulatorTarget } from "../types/discovery";

interface TargetConfirmationCardProps {
  sx?: object;
}

export const TargetConfirmationCard: React.FC<TargetConfirmationCardProps> = ({
  sx,
}) => {
  const { activeTarget, targets, setActiveTargetId } = usePopulator();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!activeTarget) {
    return null;
  }

  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleSelect = (id: string) => {
    setActiveTargetId(id);
    handleCloseMenu();
  };

  const renderTargetEmoji = (target: PopulatorTarget) => {
    const emoji =
      target.emoji || getTargetEmoji(target.projectName || target.id);
    return (
      <Typography component="span" sx={{ fontSize: "1.2rem", lineHeight: 1 }}>
        {emoji}
      </Typography>
    );
  };

  const queueName = `tiles-${activeTarget.projectName}`;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        mb: 2,
        borderRadius: 2,
        bgcolor: "rgba(56, 189, 248, 0.04)",
        borderColor: "rgba(56, 189, 248, 0.25)",
        ...sx,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 0.75,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
          {renderTargetEmoji(activeTarget)}
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: "text.primary" }}
          >
            Target Pipeline:
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 800, color: "#38bdf8" }}
          >
            {activeTarget.name}
          </Typography>
          <Chip
            label={activeTarget.source === "auto" ? "Discovered" : "Configured"}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              bgcolor:
                activeTarget.source === "auto"
                  ? "rgba(56, 189, 248, 0.15)"
                  : "rgba(251, 191, 36, 0.15)",
              color: activeTarget.source === "auto" ? "#38bdf8" : "#fbbf24",
            }}
          />
        </Box>

        {targets.length > 1 && (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SwapHorizIcon />}
              onClick={handleOpenMenu}
              sx={{
                fontSize: "0.75rem",
                textTransform: "none",
                py: 0.25,
                px: 1,
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              Switch Target
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleCloseMenu}
              PaperProps={{
                sx: { minWidth: 220, bgcolor: "background.paper" },
              }}
            >
              <Typography
                variant="caption"
                sx={{ px: 2, py: 1, color: "text.secondary", display: "block" }}
              >
                Select Active Pipeline:
              </Typography>
              <Divider sx={{ my: 0.5 }} />
              {targets.map((target) => (
                <MenuItem
                  key={target.id}
                  selected={target.id === activeTarget.id}
                  onClick={() => handleSelect(target.id)}
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  {renderTargetEmoji(target)}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: target.id === activeTarget.id ? 700 : 500,
                      }}
                    >
                      {target.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", display: "block" }}
                    >
                      Queue: tiles-{target.projectName}
                    </Typography>
                  </Box>
                  {target.id === activeTarget.id && (
                    <CheckCircleOutlineIcon
                      fontSize="small"
                      sx={{ color: "success.main" }}
                    />
                  )}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          fontSize: "0.75rem",
          color: "text.secondary",
        }}
      >
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Target Service:{" "}
          <code style={{ color: "#94a3b8" }}>{activeTarget.id}</code>
        </Typography>
        <span>•</span>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Target Queue: <code style={{ color: "#38bdf8" }}>{queueName}</code>
        </Typography>
        <span>•</span>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Target Database:{" "}
          <code style={{ color: "#94a3b8" }}>{activeTarget.dbName}</code>
        </Typography>
      </Box>
    </Paper>
  );
};
