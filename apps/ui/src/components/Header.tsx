import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip } from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';

export const Header: React.FC = () => {
  return (
    <AppBar position="static" elevation={2} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar variant="dense">
        <LayersIcon sx={{ mr: 1.5, color: 'primary.main' }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700, color: 'text.primary' }}>
          Metatile Queue Populator
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="BFF Connected" color="success" size="small" variant="outlined" />
          <Chip label="MapColonies" color="primary" size="small" />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
