import React, { useEffect, useState } from "react";
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
  Tabs,
  Tab,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import RefreshIcon from "@mui/icons-material/Refresh";
import ReplayIcon from "@mui/icons-material/Replay";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SecurityIcon from "@mui/icons-material/Security";
import axios from "axios";
import { usePopulator } from "../contexts/PopulatorContext";
import { getTargetEmoji } from "../types/discovery";

export interface HistoryRecord {
  id: string;
  type: "area" | "list";
  timestamp: string;
  parameters: Record<string, any>;
  summary: string;
  status: "SUCCESS" | "FAILED";
  target?: string;
  responseMessage?: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  clientIp?: string;
  userAgent?: string;
  requestBody?: Record<string, any>;
  queryParams?: Record<string, any>;
  details?: string;
}

interface HistoryViewProps {
  onReplayJob: (record: HistoryRecord) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onReplayJob }) => {
  const { targets } = usePopulator();
  const [activeTab, setActiveTab] = useState<"history" | "audit">("history");
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterQuery, setFilterQuery] = useState<string>("");
  const [selectedTargetFilter, setSelectedTargetFilter] =
    useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "history") {
        const response = await axios.get<HistoryRecord[]>("/api/history");
        setHistory(response.data);
      } else {
        const response = await axios.get<AuditLogRecord[]>("/api/audit");
        setAuditLogs(response.data);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch log data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const filteredHistory = history.filter((item) => {
    const itemTarget = (
      item.parameters?.targetName ||
      item.target ||
      item.parameters?.target ||
      "default"
    ).toLowerCase();
    if (selectedTargetFilter !== "ALL") {
      if (!itemTarget.includes(selectedTargetFilter.toLowerCase()))
        return false;
    }
    const q = filterQuery.toLowerCase();
    return (
      item.summary.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      item.status.toLowerCase().includes(q) ||
      itemTarget.includes(q)
    );
  });

  const filteredAuditLogs = auditLogs.filter(
    (item) =>
      item.path.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.method.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.statusCode.toString().includes(filterQuery) ||
      (item.clientIp && item.clientIp.includes(filterQuery)),
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
      {/* Header & Actions */}
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
            <HistoryIcon color="primary" /> Submission History & System Audit
            Logs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Persistent PostgreSQL audit logging for job queues, spatial
            operations, and system events.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {activeTab === "history" && (
            <Stack direction="row" spacing={0.5}>
              <Chip
                label="All Pipelines"
                size="small"
                onClick={() => setSelectedTargetFilter("ALL")}
                color={selectedTargetFilter === "ALL" ? "primary" : "default"}
                variant={selectedTargetFilter === "ALL" ? "filled" : "outlined"}
                sx={{ cursor: "pointer", fontWeight: 600 }}
              />
              {targets.map((target) => {
                const isSelected =
                  selectedTargetFilter.toLowerCase() ===
                  target.projectName.toLowerCase();
                const emoji =
                  target.emoji ||
                  getTargetEmoji(target.projectName || target.id);
                return (
                  <Chip
                    key={target.id}
                    label={`${emoji} ${target.name}`}
                    size="small"
                    onClick={() =>
                      setSelectedTargetFilter(
                        isSelected ? "ALL" : target.projectName,
                      )
                    }
                    color={isSelected ? "primary" : "default"}
                    variant={isSelected ? "filled" : "outlined"}
                    sx={{ cursor: "pointer", fontWeight: 600 }}
                  />
                );
              })}
            </Stack>
          )}

          <TextField
            size="small"
            placeholder="Search records..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            sx={{ width: 180 }}
          />
          <Tooltip title="Refresh Data">
            <span>
              <IconButton
                onClick={fetchData}
                disabled={loading}
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, val) => setActiveTab(val)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            value="history"
            icon={<HistoryIcon fontSize="small" />}
            iconPosition="start"
            label={`Job Submissions (${history.length})`}
          />
          <Tab
            value="audit"
            icon={<SecurityIcon fontSize="small" />}
            iconPosition="start"
            label={`Audit Logs (${auditLogs.length})`}
          />
        </Tabs>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* History Table */}
      {activeTab === "history" && (
        <Paper
          elevation={2}
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(255, 255, 255, 0.03)" }}>
                  <TableCell sx={{ width: 40 }} />
                  <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Job Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Target</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Summary</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align="center"
                      sx={{ py: 4, color: "text.secondary" }}
                    >
                      No submission records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((row) => (
                    <React.Fragment key={row.id}>
                      <TableRow
                        hover
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() =>
                              setExpandedId(
                                expandedId === row.id ? null : row.id,
                              )
                            }
                          >
                            {expandedId === row.id ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>
                        </TableCell>
                        <TableCell
                          sx={{ color: "text.secondary", fontSize: "0.85rem" }}
                        >
                          {new Date(row.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.type.toUpperCase()}
                            size="small"
                            color={
                              row.type === "area" ? "primary" : "secondary"
                            }
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                          />
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const rawTarget =
                              row.parameters?.targetName ||
                              row.target ||
                              row.parameters?.target ||
                              "";
                            const matchingTarget = targets.find(
                              (t) =>
                                t.id.toLowerCase() ===
                                  rawTarget.toLowerCase() ||
                                t.projectName.toLowerCase() ===
                                  rawTarget.toLowerCase(),
                            );
                            const displayName = matchingTarget
                              ? matchingTarget.name
                              : rawTarget || "Default";
                            const emoji =
                              matchingTarget?.emoji ||
                              getTargetEmoji(rawTarget);
                            return (
                              <Chip
                                label={`${emoji} ${displayName}`}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                  bgcolor: "rgba(56, 189, 248, 0.15)",
                                  color: "#38bdf8",
                                  border: "1px solid",
                                  borderColor: "rgba(56, 189, 248, 0.3)",
                                }}
                              />
                            );
                          })()}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {row.summary}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.status}
                            size="small"
                            color={
                              row.status === "SUCCESS" ? "success" : "error"
                            }
                            sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={<ReplayIcon fontSize="small" />}
                            onClick={() => onReplayJob(row)}
                            sx={{ fontSize: "0.75rem", py: 0.2 }}
                          >
                            Replay
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Expandable JSON payload details */}
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          sx={{
                            py: 0,
                            borderBottom:
                              expandedId === row.id ? undefined : "none",
                          }}
                        >
                          <Collapse
                            in={expandedId === row.id}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box
                              sx={{
                                p: 2,
                                my: 1,
                                bgcolor: "background.default",
                                borderRadius: 1.5,
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  fontWeight: 600,
                                  display: "block",
                                  mb: 1,
                                }}
                              >
                                Raw Payload & Response Metadata
                              </Typography>
                              <Box
                                component="pre"
                                sx={{
                                  m: 0,
                                  p: 1.5,
                                  bgcolor: "#0b1014",
                                  borderRadius: 1,
                                  fontSize: "0.75rem",
                                  color: "#00e5ff",
                                  overflowX: "auto",
                                  fontFamily: "monospace",
                                }}
                              >
                                {JSON.stringify(
                                  {
                                    parameters: row.parameters,
                                    responseMessage: row.responseMessage,
                                  },
                                  null,
                                  2,
                                )}
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
      )}

      {/* Audit Logs Table */}
      {activeTab === "audit" && (
        <Paper
          elevation={2}
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(255, 255, 255, 0.03)" }}>
                  <TableCell sx={{ width: 40 }} />
                  <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Path</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Latency</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Client IP</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAuditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align="center"
                      sx={{ py: 4, color: "text.secondary" }}
                    >
                      No audit logs recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow
                        hover
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() =>
                              setExpandedId(
                                expandedId === log.id ? null : log.id,
                              )
                            }
                          >
                            {expandedId === log.id ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>
                        </TableCell>
                        <TableCell
                          sx={{ color: "text.secondary", fontSize: "0.85rem" }}
                        >
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.method}
                            size="small"
                            color={
                              log.method === "POST" || log.method === "PUT"
                                ? "warning"
                                : "info"
                            }
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 500,
                            fontFamily: "monospace",
                            fontSize: "0.85rem",
                          }}
                        >
                          {log.path}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.statusCode}
                            size="small"
                            color={log.statusCode < 400 ? "success" : "error"}
                            sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{ color: "text.secondary", fontSize: "0.85rem" }}
                        >
                          {log.durationMs} ms
                        </TableCell>
                        <TableCell
                          sx={{ color: "text.secondary", fontSize: "0.85rem" }}
                        >
                          {log.clientIp || "-"}
                        </TableCell>
                      </TableRow>

                      {/* Expandable audit log detail */}
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          sx={{
                            py: 0,
                            borderBottom:
                              expandedId === log.id ? undefined : "none",
                          }}
                        >
                          <Collapse
                            in={expandedId === log.id}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box
                              sx={{
                                p: 2,
                                my: 1,
                                bgcolor: "background.default",
                                borderRadius: 1.5,
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  fontWeight: 600,
                                  display: "block",
                                  mb: 1,
                                }}
                              >
                                Request & Audit Details
                              </Typography>
                              <Box
                                component="pre"
                                sx={{
                                  m: 0,
                                  p: 1.5,
                                  bgcolor: "#0b1014",
                                  borderRadius: 1,
                                  fontSize: "0.75rem",
                                  color: "#00e5ff",
                                  overflowX: "auto",
                                  fontFamily: "monospace",
                                }}
                              >
                                {JSON.stringify(
                                  {
                                    userAgent: log.userAgent,
                                    queryParams: log.queryParams,
                                    requestBody: log.requestBody,
                                    details: log.details,
                                  },
                                  null,
                                  2,
                                )}
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
      )}
    </Box>
  );
};
