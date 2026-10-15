import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Alert,
  Chip,
  LinearProgress,
  IconButton,
} from "@mui/material";
import { Edit, Check, Close } from "@mui/icons-material";
import { COLORS, cellSx } from "../pos/PosLayout";
import budgetService from "../../services/budgetService";

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function BudgetVsExpenses() {
  const [period, setPeriod] = useState(currentPeriod());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await budgetService.getComparison(period);
      setData(result);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load budget comparison",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const startEdit = (row) => {
    setEditingId(row.accountId);
    setEditValue(row.budget || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async (row) => {
    setSaving(true);
    try {
      await budgetService.setBudget(
        row.accountId,
        period,
        Number(editValue) || 0,
      );
      setEditingId(null);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  const progressColor = (pct) => {
    if (pct === null) return "info";
    if (pct > 100) return "error";
    if (pct > 85) return "warning";
    return "success";
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h6">Budget vs Expenses</Typography>
        <TextField
          label="Month"
          type="month"
          size="small"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
          Loading...
        </Typography>
      ) : !data || data.rows.length === 0 ? (
        <Paper variant="outlined">
          <Typography
            sx={{ p: 3, textAlign: "center", color: "text.secondary" }}
          >
            No expense accounts found. Add some in Chart of Accounts first.
          </Typography>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Chip
              label={`Total Budget: ${data.totalBudget.toLocaleString()}`}
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`Total Actual: ${data.totalActual.toLocaleString()}`}
              color={data.totalActual > data.totalBudget ? "error" : "success"}
            />
          </Box>

          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={cellSx}>Expense Account</TableCell>
                  <TableCell sx={cellSx} align="right" width={140}>
                    Budget
                  </TableCell>
                  <TableCell sx={cellSx} align="right" width={120}>
                    Actual
                  </TableCell>
                  <TableCell sx={cellSx} align="right" width={120}>
                    Variance
                  </TableCell>
                  <TableCell sx={cellSx} width={160}>
                    % Used
                  </TableCell>
                  <TableCell sx={cellSx} width={50} />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.rows.map((row) => {
                  const isEditing = editingId === row.accountId;
                  return (
                    <TableRow key={row.accountId} hover>
                      <TableCell>
                        {row.code} - {row.name}
                      </TableCell>
                      <TableCell align="right">
                        {isEditing ? (
                          <TextField
                            size="small"
                            type="number"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            sx={{ width: 110 }}
                          />
                        ) : (
                          row.budget.toLocaleString()
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {row.actual.toLocaleString()}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: row.variance < 0 ? "#c62828" : "#2e7d32" }}
                      >
                        {row.variance.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {row.percentUsed === null ? (
                          <Typography variant="caption" color="text.secondary">
                            No budget set
                          </Typography>
                        ) : (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(row.percentUsed, 100)}
                              color={progressColor(row.percentUsed)}
                              sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption">
                              {row.percentUsed}%
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Box sx={{ display: "flex" }}>
                            <IconButton
                              size="small"
                              onClick={() => saveEdit(row)}
                              disabled={saving}
                            >
                              <Check fontSize="small" color="success" />
                            </IconButton>
                            <IconButton size="small" onClick={cancelEdit}>
                              <Close fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => startEdit(row)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}
