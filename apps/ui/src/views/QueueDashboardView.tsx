import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Switch,
  FormControlLabel,
  Stack,
  Alert,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import StorageIcon from "@mui/icons-material/Storage";
import axios from "axios";

interface QueueStat {
  queueName: string;
  total: number;
  active: number;
  queued: number;
  failed: number;
  completed: number;
}

interface QueueOverview {
  status: "UP" | "DEGRADED" | "DOWN";
  timestamp: string;
  populatorServiceUrl: string;
  queues: QueueStat[];
  summary: {
    totalJobs: number;
    activeJobs: number;
    queuedJobs: number;
    failedJobs: number;
    completedJobs: number;
  };
}

export const QueueDashboardView: React.FC = () => {
  const [data, setData] = useState<QueueOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<QueueOverview>("/api/queue/status");
      setData(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch queue metrics",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
      {/* Header & Controls */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <StorageIcon color="primary" /> Queue Health & Processing Metrics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live telemetry for pg-boss job queues and upstream retiler
            consumption.
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="primary"
              />
            }
            label={<Typography variant="caption">Auto-Refresh (5s)</Typography>}
          />
          <Tooltip title="Refresh Now">
            <span>
              <IconButton
                onClick={fetchStatus}
                disabled={loading}
                color="primary"
              >
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

      {data && (
        <Stack spacing={3}>
          {/* Top Status Cards */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card
                sx={{
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    POPULATOR STATUS
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    <Chip
                      label={data.status}
                      color={data.status === "UP" ? "success" : "warning"}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5, fontSize: "0.65rem" }}
                  >
                    {data.populatorServiceUrl}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card
                sx={{
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    ACTIVE JOBS
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mt: 1,
                    }}
                  >
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 700, color: "primary.main" }}
                    >
                      {data.summary.activeJobs}
                    </Typography>
                    <PlayCircleOutlineIcon color="primary" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card
                sx={{
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    QUEUED / PENDING
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mt: 1,
                    }}
                  >
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 700, color: "warning.main" }}
                    >
                      {data.summary.queuedJobs}
                    </Typography>
                    <HourglassEmptyIcon color="warning" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card
                sx={{
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    COMPLETED
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mt: 1,
                    }}
                  >
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 700, color: "success.main" }}
                    >
                      {data.summary.completedJobs}
                    </Typography>
                    <CheckCircleOutlineIcon color="success" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card
                sx={{
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    FAILED
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mt: 1,
                    }}
                  >
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        color:
                          data.summary.failedJobs > 0
                            ? "error.main"
                            : "text.secondary",
                      }}
                    >
                      {data.summary.failedJobs}
                    </Typography>
                    <ErrorOutlineIcon
                      color={data.summary.failedJobs > 0 ? "error" : "disabled"}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Detailed Queues Table */}
          <Paper
            sx={{
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Individual pg-boss Queues Breakdown
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Queue Name</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Active
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Queued
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Completed
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Failed
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Total Lifetime
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.queues.map((queue) => (
                    <TableRow key={queue.queueName} hover>
                      <TableCell
                        sx={{
                          fontFamily: "monospace",
                          fontWeight: 600,
                          color: "primary.light",
                        }}
                      >
                        {queue.queueName}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={queue.active}
                          size="small"
                          color={queue.active > 0 ? "primary" : "default"}
                        />
                      </TableCell>
                      <TableCell align="right">{queue.queued}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: "success.main", fontWeight: 600 }}
                      >
                        {queue.completed}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color:
                            queue.failed > 0 ? "error.main" : "text.secondary",
                        }}
                      >
                        {queue.failed}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {queue.total}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      )}
    </Box>
  );
};
