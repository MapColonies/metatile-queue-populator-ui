import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  InputAdornment,
  Pagination,
} from '@mui/material';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import PublicIcon from '@mui/icons-material/Public';
import MapIcon from '@mui/icons-material/Map';
import FlagIcon from '@mui/icons-material/Flag';
import StarIcon from '@mui/icons-material/Star';
import axios from 'axios';

export interface AreaPreset {
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
  createdAt: string;
}

interface PresetsViewProps {
  onLoadPreset: (preset: AreaPreset) => void;
}

const ITEMS_PER_PAGE = 12;

export const PresetsView: React.FC<PresetsViewProps> = ({ onLoadPreset }) => {
  const [presets, setPresets] = useState<AreaPreset[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [minZoom, setMinZoom] = useState<number>(0);
  const [maxZoom, setMaxZoom] = useState<number>(10);
  const [priority, setPriority] = useState<number>(0);
  const [bboxText, setBboxText] = useState<string>('34.0, 31.0, 35.0, 32.0');
  const [error, setError] = useState<string | null>(null);

  const fetchPresets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<AreaPreset[]>('/api/presets');
      setPresets(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load area presets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  const filteredPresets = useMemo(() => {
    return presets.filter((preset) => {
      const category = preset.category || (preset.id.startsWith('continent-') ? 'Continent' : preset.id.startsWith('subregion-') ? 'Subregion' : preset.id.startsWith('country-') ? 'Country' : 'Custom');
      if (activeTab !== 'all' && category.toLowerCase() !== activeTab.toLowerCase()) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          preset.name.toLowerCase().includes(query) ||
          preset.description?.toLowerCase().includes(query) ||
          preset.continent?.toLowerCase().includes(query) ||
          preset.subregion?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [presets, activeTab, search]);

  const totalPages = Math.ceil(filteredPresets.length / ITEMS_PER_PAGE);
  const paginatedPresets = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredPresets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPresets, page]);

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/presets/${id}`);
      setPresets((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete preset');
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      let area: any;
      try {
        const parts = bboxText.split(',').map((v) => parseFloat(v.trim()));
        if (parts.length === 4 && !parts.some(isNaN)) {
          area = parts;
        } else {
          area = JSON.parse(bboxText);
        }
      } catch {
        throw new Error('Area must be a valid BBOX [minLon, minLat, maxLon, maxLat] or GeoJSON object');
      }

      const payload = {
        name: name.trim(),
        category: 'Custom' as const,
        description: description.trim() || undefined,
        minZoom: Number(minZoom),
        maxZoom: Number(maxZoom),
        priority: Number(priority),
        area,
      };

      const response = await axios.post<AreaPreset>('/api/presets', payload);
      setPresets((prev) => [response.data, ...prev]);
      setCreateDialogOpen(false);
      setName('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to create preset');
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'Continent':
        return <PublicIcon fontSize="inherit" color="info" />;
      case 'Subregion':
        return <MapIcon fontSize="inherit" color="secondary" />;
      case 'Country':
        return <FlagIcon fontSize="inherit" color="success" />;
      default:
        return <StarIcon fontSize="inherit" color="warning" />;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <BookmarksIcon color="primary" /> Saved Area & Zoom Presets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hierarchical geographical presets (Continents &rarr; Sub-regions &rarr; Countries) and custom bookmarks.
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <Tooltip title="Refresh Presets">
            <span>
              <IconButton onClick={fetchPresets} disabled={loading} color="primary">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            New Preset
          </Button>
        </Stack>
      </Box>

      {/* Hierarchy Level Tabs & Search */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, val) => {
            setActiveTab(val);
            setPage(1);
          }}
          textColor="primary"
          indicatorColor="primary"
          sx={{ minHeight: 40 }}
        >
          <Tab value="all" label={`All (${presets.length})`} sx={{ minHeight: 40, py: 0.5 }} />
          <Tab value="continent" label="Continents" icon={<PublicIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 40, py: 0.5 }} />
          <Tab value="subregion" label="Sub-regions" icon={<MapIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 40, py: 0.5 }} />
          <Tab value="country" label="Countries" icon={<FlagIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 40, py: 0.5 }} />
          <Tab value="custom" label="Custom" icon={<StarIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 40, py: 0.5 }} />
        </Tabs>

        <TextField
          size="small"
          placeholder="Search country, subregion, continent..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 300 } }}
        />
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Preset Cards Grid */}
      <Grid container spacing={2.5}>
        {paginatedPresets.map((preset) => {
          const category = preset.category || (preset.id.startsWith('continent-') ? 'Continent' : preset.id.startsWith('subregion-') ? 'Subregion' : preset.id.startsWith('country-') ? 'Country' : 'Custom');
          const isBuiltIn = preset.id.startsWith('continent-') || preset.id.startsWith('subregion-') || preset.id.startsWith('country-') || preset.id.startsWith('default-');

          return (
            <Grid item xs={12} sm={6} md={4} key={preset.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'border-color 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      {preset.name}
                    </Typography>
                    <Stack direction="row" spacing={0.5}>
                      <Chip
                        icon={getCategoryIcon(category)}
                        label={category}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.65rem', height: 22 }}
                      />
                      <Chip
                        label={`Z${preset.minZoom}-Z${preset.maxZoom}`}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 600, fontSize: '0.65rem', height: 22 }}
                      />
                    </Stack>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, minHeight: 36, fontSize: '0.8rem' }}>
                    {preset.description || `${category} in ${preset.continent || 'Global'}`}
                  </Typography>

                  <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                      BOUNDS ({Array.isArray(preset.area) ? 'BBOX' : 'GeoJSON'})
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.7rem',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {Array.isArray(preset.area)
                        ? `[${preset.area.map((v) => Number(v).toFixed(2)).join(', ')}]`
                        : `${preset.name} Polygon Boundaries`}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => onLoadPreset(preset)}
                  >
                    Load on Map
                  </Button>

                  {!isBuiltIn && (
                    <Tooltip title="Delete Preset">
                      <IconButton size="small" color="error" onClick={() => handleDelete(preset.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_e, val) => setPage(val)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Create Preset Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Area Preset</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Preset Name"
              size="small"
              required
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Galilee Region AOI"
            />
            <TextField
              label="Description"
              size="small"
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Operational description or notes"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Min Zoom"
                type="number"
                size="small"
                value={minZoom}
                onChange={(e) => setMinZoom(parseInt(e.target.value, 10))}
                fullWidth
              />
              <TextField
                label="Max Zoom"
                type="number"
                size="small"
                value={maxZoom}
                onChange={(e) => setMaxZoom(parseInt(e.target.value, 10))}
                fullWidth
              />
              <TextField
                label="Priority"
                type="number"
                size="small"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10))}
                fullWidth
              />
            </Box>
            <TextField
              label="Bounding Box (minLon, minLat, maxLon, maxLat) or GeoJSON"
              size="small"
              required
              multiline
              rows={3}
              fullWidth
              value={bboxText}
              onChange={(e) => setBboxText(e.target.value)}
              sx={{ fontFamily: 'monospace' }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!name.trim()}>
            Create Preset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
