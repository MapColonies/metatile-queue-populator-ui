import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Chip } from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import axios from 'axios';

export const Header: React.FC = () => {
  const [bffConnected, setBffConnected] = useState<boolean | null>(null);

  const checkBffHealth = async () => {
    try {
      // Check BFF availability with short timeout
      await axios.get('/api/config/raster', { timeout: 3000 });
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

  return (
    <AppBar position="static" elevation={2} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar variant="dense">
        <LayersIcon sx={{ mr: 1.5, color: 'primary.main' }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700, color: 'text.primary' }}>
          Metatile Queue Populator
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
              label="BFF Connection Error"
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
