import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Button,
  TextField,
  Collapse,
  Stack,
  Alert,
  LinearProgress,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplayIcon from '@mui/icons-material/Replay';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import axios from 'axios';

export interface HistoryRecord {
  id: string;
  type: 'area' | 'list';
  timestamp: string;
  parameters: Record<string, any>;
  summary: string;
  status: 'SUCCESS' | 'FAILED';
  responseMessage?: string;
}

interface HistoryViewProps {
  onReplayJob: (record: HistoryRecord) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onReplayJob }) => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<HistoryRecord[]>('/api/history');
      setHistory(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch submission history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = history.filter(
    (item) =>
      item.summary.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.status.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      {/* Header & Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon color="primary" /> Job Submission History & Audit Log
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Audit past retiler submissions, view payload metadata, and 1-click replay configurations.
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search history..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            sx={{ width: 220 }}
          />
          <Tooltip title="Refresh History">
            <span>
              <IconButton onClick={fetchHistory} disabled={loading} color="primary">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* History Table */}
      <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 48 }} />
                <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Summary</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {loading ? 'Loading history records...' : 'No submission records found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistory.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                        >
                          {expandedId === row.id ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        {new Date(row.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.type.toUpperCase()}
                          size="small"
                          color={row.type === 'area' ? 'primary' : 'secondary'}
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{row.summary}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          size="small"
                          color={row.status === 'SUCCESS' ? 'success' : 'error'}
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<ReplayIcon fontSize="small" />}
                          onClick={() => onReplayJob(row)}
                          sx={{ fontSize: '0.75rem', py: 0.2 }}
                        >
                          Replay
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expandable JSON payload details */}
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0, borderBottom: expandedId === row.id ? undefined : 'none' }}>
                        <Collapse in={expandedId === row.id} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, my: 1, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                              Raw Payload & Response Metadata
                            </Typography>
                            <Box
                              component="pre"
                              sx={{
                                m: 0,
                                p: 1.5,
                                bgcolor: '#0b1014',
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                color: '#00e5ff',
                                overflowX: 'auto',
                                fontFamily: 'monospace',
                              }}
                            >
                              {JSON.stringify({ parameters: row.parameters, responseMessage: row.responseMessage }, null, 2)}
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
