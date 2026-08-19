import React, { useState } from 'react';
import { ThemeProvider, CssBaseline, Box, Tabs, Tab, Paper, Container, Typography } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HistoryIcon from '@mui/icons-material/History';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { darkTheme } from './theme/index.ts';
import { Header } from './components/Header.tsx';
import { MapComponent } from './components/MapComponent.tsx';
import { AreaForm } from './components/AreaForm.tsx';
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
      style={{ flexGrow: 1, display: value === index ? 'flex' : 'none', flexDirection: 'column' }}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedArea, setSelectedArea] = useState<SelectedArea>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
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
              <MapComponent onAreaSelected={setSelectedArea} />
              <Box sx={{ position: 'absolute', top: 16, right: 70, zIndex: 10 }}>
                <AreaForm selectedArea={selectedArea} />
              </Box>
            </Box>
          </CustomTabPanel>

          <CustomTabPanel value={currentTab} index={1}>
            <Container maxWidth="lg" sx={{ py: 3 }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                Queue Monitoring & Health
              </Typography>
              <Paper sx={{ p: 4, border: '1px dashed #2c3842', textAlign: 'center' }}>
                <Typography color="text.secondary">
                  [pg-boss / Postgres Real-time Queue Metrics Dashboard - Ticket 12]
                </Typography>
              </Paper>
            </Container>
          </CustomTabPanel>

          <CustomTabPanel value={currentTab} index={2}>
            <Container maxWidth="lg" sx={{ py: 3 }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                Job Submission History
              </Typography>
              <Paper sx={{ p: 4, border: '1px dashed #2c3842', textAlign: 'center' }}>
                <Typography color="text.secondary">
                  [Submission Audit Log & 1-Click Replay - Ticket 13]
                </Typography>
              </Paper>
            </Container>
          </CustomTabPanel>

          <CustomTabPanel value={currentTab} index={3}>
            <Container maxWidth="lg" sx={{ py: 3 }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                Saved Presets
              </Typography>
              <Paper sx={{ p: 4, border: '1px dashed #2c3842', textAlign: 'center' }}>
                <Typography color="text.secondary">
                  [Area & Zoom Configuration Presets - Ticket 14]
                </Typography>
              </Paper>
            </Container>
          </CustomTabPanel>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
