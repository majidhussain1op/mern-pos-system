import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  TextField,
  Select,
  MenuItem,
  Button,
  Grid,
  Pagination,
  CircularProgress,
} from "@mui/material";
import PosLayout, { cellSx, fieldSx } from "../pos/PosLayout";
import shiftService from "../../services/ShiftServices";

export default function CashMovementHistory() {
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    type: "",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(1);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = { ...filters, page, limit: 30 };
      Object.keys(params).forEach((k) => {
        if (!params[k]) delete params[k];
      });

      const res = await shiftService.getCashMovementHistory(params);
      setMovements(res.data.data);
      setSummary(res.data.summary);
      setPagination(res.data.pagination);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const applyFilters = () => {
    setPage(1);
    fetchHistory();
  };

  const clearFilters = () => {
    setFilters({ type: "", from: "", to: "" });
    setPage(1);
    setTimeout(fetchHistory, 0);
  };

  return (
    <PosLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={600} mb={2}>
          Cash In / Out History
        </Typography>

        {summary && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Paper
                sx={{
                  p: 2,
                  textAlign: "center",
                  borderLeft: "4px solid #2e7d32",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total Cash In
                </Typography>
                <Typography variant="h6" fontWeight={700} color="#2e7d32">
                  Rs {summary.totalCashIn}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {summary.countCashIn} entries
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper
                sx={{
                  p: 2,
                  textAlign: "center",
                  borderLeft: "4px solid #c62828",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total Cash Out
                </Typography>
                <Typography variant="h6" fontWeight={700} color="#c62828">
                  Rs {summary.totalCashOut}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {summary.countCashOut} entries
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Net Cash Movement
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  Rs {summary.totalCashIn - summary.totalCashOut}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Total Entries
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {pagination.total}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        <Paper
          sx={{
            p: 2,
            mb: 2,
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Select
            size="small"
            value={filters.type}
            onChange={(e) =>
              setFilters((f) => ({ ...f, type: e.target.value }))
            }
            displayEmpty
            sx={{ ...fieldSx, minWidth: 140 }}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="CASH_IN">Cash In</MenuItem>
            <MenuItem value="CASH_OUT">Cash Out</MenuItem>
          </Select>

          <TextField
            size="small"
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={filters.from}
            onChange={(e) =>
              setFilters((f) => ({ ...f, from: e.target.value }))
            }
            sx={fieldSx}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            sx={fieldSx}
          />

          <Button variant="contained" onClick={applyFilters}>
            Apply
          </Button>
          <Button variant="outlined" onClick={clearFilters}>
            Clear
          </Button>
        </Paper>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#e0e0e0" }}>
                  <TableCell sx={cellSx}>Date/Time</TableCell>
                  <TableCell sx={cellSx}>Type</TableCell>
                  <TableCell sx={cellSx}>Amount</TableCell>
                  <TableCell sx={cellSx}>Reason</TableCell>
                  <TableCell sx={cellSx}>Shift #</TableCell>
                  <TableCell sx={cellSx}>Cashier</TableCell>
                  <TableCell sx={cellSx}>Recorded By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: "center", py: 3 }}>
                      Koi cash movement nahi mila
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((m) => (
                    <TableRow key={m._id}>
                      <TableCell sx={cellSx}>
                        {new Date(m.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell sx={cellSx}>
                        <Chip
                          label={m.type === "CASH_IN" ? "Cash In" : "Cash Out"}
                          size="small"
                          sx={{
                            bgcolor:
                              m.type === "CASH_IN" ? "#e8f5e9" : "#ffebee",
                            color: m.type === "CASH_IN" ? "#2e7d32" : "#c62828",
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={cellSx}>Rs {m.amount}</TableCell>
                      <TableCell sx={cellSx}>{m.reason}</TableCell>
                      <TableCell sx={cellSx}>
                        {m.shift?.shiftNumber || "-"}
                      </TableCell>
                      <TableCell sx={cellSx}>
                        {m.shift?.cashier?.name || "-"}
                      </TableCell>
                      <TableCell sx={cellSx}>
                        {m.createdBy?.name || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        )}

        {pagination.pages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination
              count={pagination.pages}
              page={page}
              onChange={(e, val) => setPage(val)}
            />
          </Box>
        )}
      </Box>
    </PosLayout>
  );
}
