import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  MenuItem,
  Stack,
  Chip,
  Button,
  Alert,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Link } from "react-router-dom";
import { COLORS, cellSx, fieldSx } from "../pos/PosLayout";
import shiftService from "../../services/ShiftServices";

export default function ShiftHistory() {
  const [shifts, setShifts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [forceCloseTarget, setForceCloseTarget] = useState(null); // shift object
  const [forceClosingCash, setForceClosingCash] = useState("");
  const [forceCloseReason, setForceCloseReason] = useState("");

  const fetchHistory = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (status) params.status = status;
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await shiftService.getShiftHistory(params);
      setShifts(res.data.data);
      setPagination(res.data.pagination);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load shift history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, from, to]);

  const openForceCloseDialog = (shift) => {
    setForceCloseTarget(shift);
    setForceClosingCash("");
    setForceCloseReason("");
  };

  const handleForceClose = async () => {
    if (!forceCloseReason.trim()) {
      setError("Force close ki wajah likhna zaroori hai");
      return;
    }
    try {
      await shiftService.forceCloseShift(
        forceCloseTarget._id,
        forceClosingCash === "" ? undefined : Number(forceClosingCash),
        forceCloseReason.trim(),
      );
      setForceCloseTarget(null);
      fetchHistory(pagination.page);
    } catch (err) {
      setError(err?.response?.data?.message || "Force close failed");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Shift History
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ ...fieldSx, width: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="OPEN">Open</MenuItem>
          <MenuItem value="CLOSED">Closed</MenuItem>
        </TextField>
        <TextField
          label="From"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={fieldSx}
        />
        <TextField
          label="To"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={fieldSx}
        />
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={cellSx}>Shift #</TableCell>
              <TableCell sx={cellSx}>Cashier</TableCell>
              <TableCell sx={cellSx}>Status</TableCell>
              <TableCell sx={cellSx}>Opened At</TableCell>
              <TableCell sx={cellSx}>Closed At</TableCell>
              <TableCell sx={cellSx}>Variance</TableCell>
              <TableCell sx={cellSx}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} sx={cellSx}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : shifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={cellSx}>
                  Koi shift nahi mila
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => (
                <TableRow key={shift._id}>
                  <TableCell sx={cellSx}>{shift.shiftNumber}</TableCell>
                  <TableCell sx={cellSx}>
                    {shift.cashier?.name || "—"}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <Chip
                      label={shift.status}
                      size="small"
                      color={shift.status === "OPEN" ? "success" : "default"}
                    />
                    {shift.isForceClosed && (
                      <Chip
                        label="FORCE CLOSED"
                        size="small"
                        color="warning"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {new Date(shift.openedAt).toLocaleString()}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {shift.closedAt
                      ? new Date(shift.closedAt).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {shift.variance === null || shift.variance === undefined ? (
                      "—"
                    ) : (
                      <span
                        style={{
                          color:
                            shift.variance === 0
                              ? COLORS?.success
                              : COLORS?.error,
                          fontWeight: 600,
                        }}
                      >
                        {shift.variance > 0 ? "+" : ""}
                        {shift.variance}
                      </span>
                    )}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        component={Link}
                        to={`/pos/shift/${shift._id}/report`}
                      >
                        Report
                      </Button>
                      {shift.status === "OPEN" && (
                        <Button
                          size="small"
                          color="warning"
                          onClick={() => openForceCloseDialog(shift)}
                        >
                          Force Close
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Stack alignItems="center" sx={{ mt: 2 }}>
        <Pagination
          count={pagination.pages}
          page={pagination.page}
          onChange={(_, page) => fetchHistory(page)}
        />
      </Stack>

      {/* Force Close confirmation dialog */}
      <Dialog
        open={Boolean(forceCloseTarget)}
        onClose={() => setForceCloseTarget(null)}
      >
        <DialogTitle>
          Force Close Shift {forceCloseTarget?.shiftNumber}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
            <TextField
              label="Closing Cash (optional — khaali chhodo to expected cash use hoga)"
              type="number"
              value={forceClosingCash}
              onChange={(e) => setForceClosingCash(e.target.value)}
              sx={fieldSx}
            />
            <TextField
              label="Reason (zaroori hai)"
              value={forceCloseReason}
              onChange={(e) => setForceCloseReason(e.target.value)}
              multiline
              rows={2}
              sx={fieldSx}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForceCloseTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleForceClose}
          >
            Force Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
