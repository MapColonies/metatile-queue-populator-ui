import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  Stack,
  Divider,
  Chip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import LayersIcon from '@mui/icons-material/Layers';
import { SelectedArea } from '../types/geometry.ts';
import { TileEstimationWidget } from './TileEstimationWidget.tsx';
import axios from 'axios';

interface AreaFormProps {
  selectedArea: SelectedArea;
}

export const AreaForm: React.FC<AreaFormProps> = ({ selectedArea }) => {
  const [zoomRange, setZoomRange] = useState<[number, number]>([0, 10]);
  const [priority, setPriority] = useState<number>(0);
  const [force, setForce] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const handleZoomChange = (_event: Event, newValue: number | number[]) => {
    setZoomRange(newValue as [number, number]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArea) {
      setToast({
        open: true,
        message: 'Please draw an area or bounding box on the map before submitting.',
        severity: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        minZoom: zoomRange[0],
        maxZoom: zoomRange[1],
        priority: Number(priority),
      };

      if (selectedArea.type === 'bbox') {
        payload.area = selectedArea.bbox;
      } else {
        payload.area = selectedArea.geojson;
      }

      const response = await axios.post('/api/tiles/area', payload, {
        params: { force },
      });

      setToast({
        open: true,
        message: response.data.message || 'Area tiles successfully added to queue!',
        severity: 'success',
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to submit area job';
      setToast({
        open: true,
        message: errorMsg,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        width: 380,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        p: 2.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <LayersIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Queue Area Job
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Calculate and queue metatiles within the selected geographical boundary.
      </Typography>

      <Divider sx={{ mb: 2 }} />

      <form onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          {/* Selected Geometry Status */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              TARGET GEOMETRY
            </Typography>
            <Box sx={{ mt: 0.8, p: 1.2, bgcolor: 'rgba(0,0,0,0.25)', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              {selectedArea ? (
                <Box>
                  <Chip
                    label={selectedArea.type === 'bbox' ? 'Bounding Box (BBOX)' : 'GeoJSON Feature'}
                    size="small"
                    color="primary"
                    sx={{ mb: 0.8 }}
                  />
                  <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {selectedArea.type === 'bbox'
                      ? `[${selectedArea.bbox.join(', ')}]`
                      : `Type: ${selectedArea.geojson.geometry?.type || 'Geometry'}`}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No area selected. Use the map drawing tools on the left to draw a box or polygon.
                </Typography>
              )}
            </Box>
          </Box>

          {/* Zoom Range Slider */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                ZOOM RANGE (0 - 18)
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {zoomRange[0]} — {zoomRange[1]}
              </Typography>
            </Box>
            <Slider
              value={zoomRange}
              onChange={handleZoomChange}
              valueLabelDisplay="auto"
              min={0}
              max={18}
              marks={[
                { value: 0, label: '0' },
                { value: 6, label: '6' },
                { value: 12, label: '12' },
                { value: 18, label: '18' },
              ]}
              disableSwap
            />
          </Box>

          {/* Real-time Tile Estimation Preview */}
          <TileEstimationWidget selectedArea={selectedArea} zoomRange={zoomRange} />

          {/* Priority */}
          <TextField
            label="Job Priority"
            type="number"
            size="small"
            value={priority}
            onChange={(e) => setPriority(Math.max(0, parseInt(e.target.value) || 0))}
            helperText="Higher values are prioritized first by the retiler"
            fullWidth
            inputProps={{ min: 0 }}
          />

          {/* Force Toggle */}
          <FormControlLabel
            control={<Switch checked={force} onChange={(e) => setForce(e.target.checked)} color="warning" />}
            label={<Typography variant="body2">Force queueing (overwrite duplicates)</Typography>}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={!selectedArea || loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            fullWidth
            sx={{ mt: 1 }}
          >
            {loading ? 'Submitting to Queue...' : 'Populate Queue'}
          </Button>
        </Stack>
      </form>

      {/* Notification Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};
