import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
} from '@mui/material';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import SendIcon from '@mui/icons-material/Send';
import LayersIcon from '@mui/icons-material/Layers';
import { SelectedArea } from '../types/geometry.ts';
import { TileEstimationWidget } from './TileEstimationWidget.tsx';
import { SpatialDropzone } from './SpatialDropzone.tsx';
import axios from 'axios';

interface Preset {
  id: string;
  name: string;
  category?: 'Continent' | 'Subregion' | 'Country' | 'Custom';
  continent?: string;
  subregion?: string;
  description?: string;
  minZoom: number;
  maxZoom: number;
  priority?: number;
  area: [number, number, number, number] | Record<string, any>;
}

interface AreaFormProps {
  selectedArea: SelectedArea;
  onAreaChange: (area: SelectedArea) => void;
}

export const AreaForm: React.FC<AreaFormProps> = ({ selectedArea, onAreaChange }) => {
  const [zoomRange, setZoomRange] = useState<[number, number]>([0, 10]);
  const [priority, setPriority] = useState<number>(0);
  const [force, setForce] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [saveDialogOpen, setSaveDialogOpen] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [newPresetDesc, setNewPresetDesc] = useState<string>('');
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const fetchPresets = async () => {
    try {
      const response = await axios.get<Preset[]>('/api/presets');
      setPresets(response.data);
    } catch {
      // Ignore background preset fetch errors
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    setZoomRange([preset.minZoom, preset.maxZoom]);
    if (preset.priority !== undefined) setPriority(preset.priority);

    if (Array.isArray(preset.area)) {
      onAreaChange({ type: 'bbox', bbox: preset.area as [number, number, number, number] });
    } else {
      onAreaChange({ type: 'geojson', geojson: preset.area });
    }
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim() || !selectedArea) return;
    try {
      const payload: any = {
        name: newPresetName.trim(),
        description: newPresetDesc.trim() || undefined,
        minZoom: zoomRange[0],
        maxZoom: zoomRange[1],
        priority,
        area: selectedArea.type === 'bbox' ? selectedArea.bbox : selectedArea.geojson,
      };

      const response = await axios.post('/api/presets', payload);
      setPresets((prev) => [response.data, ...prev]);
      setSaveDialogOpen(false);
      setNewPresetName('');
      setNewPresetDesc('');
      setToast({
        open: true,
        message: `Preset "${payload.name}" saved!`,
        severity: 'success',
      });
    } catch (err: any) {
      setToast({
        open: true,
        message: err.response?.data?.message || 'Failed to save preset',
        severity: 'error',
      });
    }
  };

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

      // Record in Submission History
      await axios.post('/api/history', {
        type: 'area',
        parameters: payload,
        status: 'SUCCESS',
        responseMessage: response.data.message || 'Queued successfully',
      }).catch(() => null);

      setToast({
        open: true,
        message: response.data.message || 'Area tiles successfully added to queue!',
        severity: 'success',
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to submit area job';
      
      // Record failure in history
      await axios.post('/api/history', {
        type: 'area',
        parameters: { minZoom: zoomRange[0], maxZoom: zoomRange[1], area: selectedArea.type === 'bbox' ? selectedArea.bbox : selectedArea.geojson },
        status: 'FAILED',
        responseMessage: errorMsg,
      }).catch(() => null);

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

      {/* Preset Selector */}
      {presets.length > 0 && (
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel id="preset-select-label">Load Preset (Continent / Sub-region / Country)</InputLabel>
          <Select
            labelId="preset-select-label"
            label="Load Preset (Continent / Sub-region / Country)"
            value={selectedPresetId}
            onChange={(e) => handlePresetSelect(e.target.value as string)}
          >
            {/* Group: Continents */}
            <MenuItem disabled sx={{ fontWeight: 700, opacity: 1, color: 'primary.main', fontSize: '0.75rem' }}>
              ── CONTINENTS ──
            </MenuItem>
            {presets
              .filter((p) => p.category === 'Continent' || p.id.startsWith('continent-'))
              .map((preset) => (
                <MenuItem key={preset.id} value={preset.id} sx={{ pl: 3 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      🌍 {preset.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Z{preset.minZoom}-Z{preset.maxZoom} • Continent extent
                    </Typography>
                  </Box>
                </MenuItem>
              ))}

            {/* Group: Sub-regions */}
            <MenuItem disabled sx={{ fontWeight: 700, opacity: 1, color: 'primary.main', fontSize: '0.75rem' }}>
              ── SUB-REGIONS ──
            </MenuItem>
            {presets
              .filter((p) => p.category === 'Subregion' || p.id.startsWith('subregion-'))
              .map((preset) => (
                <MenuItem key={preset.id} value={preset.id} sx={{ pl: 3 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      🗺️ {preset.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Z{preset.minZoom}-Z{preset.maxZoom} • {preset.continent || 'Region'}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}

            {/* Group: Countries */}
            <MenuItem disabled sx={{ fontWeight: 700, opacity: 1, color: 'primary.main', fontSize: '0.75rem' }}>
              ── COUNTRIES ──
            </MenuItem>
            {presets
              .filter((p) => p.category === 'Country' || p.id.startsWith('country-') || p.id.startsWith('default-'))
              .slice(0, 100)
              .map((preset) => (
                <MenuItem key={preset.id} value={preset.id} sx={{ pl: 3 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      🚩 {preset.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Z{preset.minZoom}-Z{preset.maxZoom} • {preset.subregion || preset.continent || 'Country'}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}

            {/* Group: Custom Saved Presets */}
            {presets.some((p) => p.category === 'Custom' || (!p.id.startsWith('continent-') && !p.id.startsWith('subregion-') && !p.id.startsWith('country-') && !p.id.startsWith('default-'))) && (
              <>
                <MenuItem disabled sx={{ fontWeight: 700, opacity: 1, color: 'primary.main', fontSize: '0.75rem' }}>
                  ── CUSTOM BOOKMARKS ──
                </MenuItem>
                {presets
                  .filter((p) => p.category === 'Custom' || (!p.id.startsWith('continent-') && !p.id.startsWith('subregion-') && !p.id.startsWith('country-') && !p.id.startsWith('default-')))
                  .map((preset) => (
                    <MenuItem key={preset.id} value={preset.id} sx={{ pl: 3 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          ⭐ {preset.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Z{preset.minZoom}-Z{preset.maxZoom}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
              </>
            )}
          </Select>
        </FormControl>
      )}

      {/* Spatial File Dropzone */}
      <SpatialDropzone onGeometryLoaded={onAreaChange} />

      <Divider sx={{ mb: 2 }} />

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Target Area Readout & Save Preset */}
          <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                TARGET GEOMETRY
              </Typography>
              {selectedArea && (
                <Button
                  size="small"
                  variant="text"
                  startIcon={<BookmarkBorderIcon fontSize="inherit" />}
                  onClick={() => setSaveDialogOpen(true)}
                  sx={{ fontSize: '0.7rem', py: 0.1, minWidth: 0 }}
                >
                  Save Preset
                </Button>
              )}
            </Box>

            {selectedArea ? (
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={selectedArea.type === 'bbox' ? 'Bounding Box (BBOX)' : 'Polygon Geometry (GeoJSON)'}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 600, mb: 0.5 }}
                />
                <Typography variant="caption" sx={{ display: 'block', wordBreak: 'break-all', fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.7rem' }}>
                  {selectedArea.type === 'bbox'
                    ? `[${selectedArea.bbox.map((v) => v.toFixed(4)).join(', ')}]`
                    : 'Active GeoJSON Feature/Collection loaded'}
                </Typography>
              </Box>
            ) : (
              <Alert severity="info" sx={{ mt: 1, py: 0.5, fontSize: '0.75rem' }}>
                Use map toolbar on left to draw BBOX or Polygon, or drop a spatial file above.
              </Alert>
            )}
          </Box>
        </Box>

        <Stack spacing={2.5} sx={{ mt: 2.5 }}>
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
      {/* Save Preset Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Save as Area Preset</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Save the current map geometry and zoom configuration (Z{zoomRange[0]}-Z{zoomRange[1]}) as a reusable preset.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Preset Name"
              size="small"
              fullWidth
              required
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="e.g. Northern District AOI"
            />
            <TextField
              label="Description (Optional)"
              size="small"
              fullWidth
              value={newPresetDesc}
              onChange={(e) => setNewPresetDesc(e.target.value)}
              placeholder="Operational bounds description"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePreset} disabled={!newPresetName.trim()}>
            Save Preset
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};
