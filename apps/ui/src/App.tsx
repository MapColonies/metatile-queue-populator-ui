import React, { useState } from 'react';
import { ThemeProvider, CssBaseline, Box, Tabs, Tab, Paper, Button } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HistoryIcon from '@mui/icons-material/History';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { darkTheme } from './theme/index.ts';
import { Header } from './components/Header.tsx';
import { MapComponent } from './components/MapComponent.tsx';
import { AreaForm } from './components/AreaForm.tsx';
import { TileListForm } from './components/TileListForm.tsx';
import { QueueDashboardView } from './views/QueueDashboardView.tsx';
import { HistoryView, HistoryRecord } from './views/HistoryView.tsx';
import { PresetsView, AreaPreset } from './views/PresetsView.tsx';
import { SelectedArea } from './types/geometry.ts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      style={{
        height: '100%',
        display: value === index ? 'flex' : 'none',
        flexDirection: 'column',
        overflowY: index === 0 ? 'hidden' : 'auto',
        overflowX: 'hidden',
        flexGrow: 1,
      }}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [creatorMode, setCreatorMode] = useState<'area' | 'list'>('area');
  const [isPresetMode, setIsPresetMode] = useState<boolean>(false);
  const [selectedArea, setSelectedArea] = useState<SelectedArea>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    if (newValue !== 0) {
      setIsPresetMode(false);
    }
  };

  const handleReplayJob = (record: HistoryRecord) => {
    setIsPresetMode(false);
    if (record.type === 'area') {
      setCreatorMode('area');
      const params = record.parameters;
      if (Array.isArray(params.area)) {
        setSelectedArea({ type: 'bbox', bbox: params.area as [number, number, number, number] });
      } else if (params.area) {
        setSelectedArea({ type: 'geojson', geojson: params.area });
      }
    } else {
      setCreatorMode('list');
    }
    setCurrentTab(0); // Switch to Map Creator Tab
  };

  const handleLoadPreset = (preset: AreaPreset) => {
    setIsPresetMode(false);
    setCreatorMode('area');
    if (Array.isArray(preset.area)) {
      setSelectedArea({ type: 'bbox', bbox: preset.area as [number, number, number, number] });
    } else {
      setSelectedArea({ type: 'geojson', geojson: preset.area });
    }
    setCurrentTab(0); // Switch to Map Creator Tab
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <Header />
        
        {/* Navigation Tabs */}
        <Paper square elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<MapIcon fontSize="small" />} iconPosition="start" label="Queue Creator" />
            <Tab icon={<DashboardIcon fontSize="small" />} iconPosition="start" label="Queue Status" />
            <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label="Submission History" />
            <Tab icon={<BookmarkIcon fontSize="small" />} iconPosition="start" label="Presets" />
          </Tabs>
        </Paper>

        {/* Tab Content Areas */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <CustomTabPanel value={currentTab} index={0}>
            <Box sx={{ flexGrow: 1, width: '100%', height: '100%', position: 'relative', display: 'flex' }}>
              <MapComponent externalArea={selectedArea} onAreaSelected={setSelectedArea} />
              
              {/* Floating Form Overlay with Mode Toggle */}
              <Box sx={{ position: 'absolute', top: 16, right: 70, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Paper
                  elevation={3}
                  sx={{
                    p: 0.5,
                    display: 'flex',
                    justifyContent: 'center',
                    bgcolor: 'rgba(26, 34, 40, 0.95)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid',
                    borderColor: isPresetMode ? 'secondary.main' : 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Button
                    size="small"
                    variant={creatorMode === 'area' ? 'contained' : 'text'}
                    color={isPresetMode ? 'secondary' : 'primary'}
                    onClick={() => setCreatorMode('area')}
                    sx={{ px: 2 }}
                  >
                    {isPresetMode ? 'Preset Designer' : 'Area Mode'}
                  </Button>
                  {!isPresetMode && (
                    <Button
                      size="small"
                      variant={creatorMode === 'list' ? 'contained' : 'text'}
                      color="primary"
                      onClick={() => setCreatorMode('list')}
                      sx={{ px: 2 }}
                    >
                      Tile List Mode
                    </Button>
                  )}
                </Paper>

                {creatorMode === 'area' ? (
                  <AreaForm
                    selectedArea={selectedArea}
                    onAreaChange={setSelectedArea}
                    isPresetMode={isPresetMode}
                    onCancelPresetMode={() => setIsPresetMode(false)}
                    onPresetSaved={() => {
                      setIsPresetMode(false);
                    }}
                  />
                ) : (
                  <TileListForm />
                )}
              </Box>
            </Box>
          </CustomTabPanel>

          <CustomTabPanel value={currentTab} index={1}>
            <QueueDashboardView />
          </CustomTabPanel>

          <CustomTabPanel value={currentTab} index={2}>
            <HistoryView onReplayJob={handleReplayJob} />
          </CustomTabPanel>

          <CustomTabPanel value={currentTab} index={3}>
            <PresetsView
              onLoadPreset={handleLoadPreset}
              onNavigateToDraw={() => {
                setIsPresetMode(true);
                setCreatorMode('area');
                setCurrentTab(0);
              }}
            />
          </CustomTabPanel>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
