import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Divider,
  Alert,
  Chip,
  Stack,
} from "@mui/material";
import { COLORS, cellSx, fieldSx } from "../pos/PosLayout";
import shiftService from "../../services/ShiftServices";
import CashMovementDialog from "../../components/CashMovementDialog";

export default function ShiftManagement() {
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [closedSummary, setClosedSummary] = useState(null);

  const fetchCurrentShift = async () => {
    try {
      setLoading(true);
      const res = await shiftService.getCurrentShift();
      setShift(res.data.data);
      setError("");
    } catch (err) {
      // 404 = no open shift, that's a normal state, not an error
      if (err?.response?.status === 404) {
        setShift(null);
      } else {
        setError(err?.response?.data?.message || "Failed to load shift");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentShift();
  }, []);

  const handleOpenShift = async () => {
    if (!openingCash || Number(openingCash) < 0) {
      setError("Enter a valid opening cash amount");
      return;
    }
    try {
      setError("");
      await shiftService.openShift(Number(openingCash));
      setOpeningCash("");
      fetchCurrentShift();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to open shift");
    }
  };

  const handleCloseShift = async () => {
    if (!closingCash || Number(closingCash) < 0) {
      setError("Enter a valid closing cash amount");
      return;
    }
    try {
      setError("");
      const res = await shiftService.closeShift(Number(closingCash));
      setClosedSummary(res.data.data);
      setShift(null);
      setClosingCash("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to close shift");
    }
  };

  if (loading)
    return <Typography sx={{ p: 3 }}>Loading shift status...</Typography>;

  return (
    <Box sx={{ p: 3, maxWidth: 700, mx: "auto" }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Shift Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {closedSummary && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setClosedSummary(null)}
        >
          Shift {closedSummary.shiftNumber} closed. Expected: Rs{" "}
          {closedSummary.expectedCash} | Actual: Rs {closedSummary.closingCash}{" "}
          | Variance:{" "}
          <b
            style={{
              color: closedSummary.variance === 0 ? "#2e7d32" : "#c62828",
            }}
          >
            {closedSummary.variance > 0 ? "+" : ""}
            {closedSummary.variance}
          </b>
        </Alert>
      )}

      {closedSummary && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setClosedSummary(null)}
        >
          Shift {closedSummary.shiftNumber} closed. Expected: Rs{" "}
          {closedSummary.expectedCash} | Actual: Rs {closedSummary.closingCash}{" "}
          | Variance:{" "}
          <b
            style={{
              color:
                closedSummary.variance === 0 ? COLORS?.success : COLORS?.error,
            }}
          >
            {closedSummary.variance > 0 ? "+" : ""}
            {closedSummary.variance}
          </b>
        </Alert>
      )}

      {/* NO OPEN SHIFT — show open form */}
      {!shift && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            No shift is open. Enter opening cash to start.
          </Typography>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Opening Cash"
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <Button variant="contained" onClick={handleOpenShift}>
              Open Shift
            </Button>
          </Stack>
        </Paper>
      )}

      {/* OPEN SHIFT — show live status */}
      {shift && (
        <Paper sx={{ p: 3 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              Shift {shift.shiftNumber}
            </Typography>
            <Chip label="OPEN" color="success" size="small" />
          </Stack>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Opening Cash
              </Typography>
              <Typography fontWeight={600}>Rs {shift.openingCash}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Opened At
              </Typography>
              <Typography fontWeight={600}>
                {new Date(shift.openedAt).toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Cash In (total)
              </Typography>
              <Typography fontWeight={600}>Rs {shift.totalCashIn}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Cash Out (total)
              </Typography>
              <Typography fontWeight={600}>Rs {shift.totalCashOut}</Typography>
            </Grid>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Sales So Far
            </Typography>
            <Typography fontWeight={600}>
              {shift.totalSalesCount} bills — Rs{" "}
              {shift.totalCashSales +
                shift.totalCardSales +
                shift.totalOtherTenderSales}
            </Typography>
          </Grid>

          <Button
            variant="outlined"
            fullWidth
            sx={{ mb: 3 }}
            onClick={() => setShowCashDialog(true)}
          >
            + Cash In / Cash Out
          </Button>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Close Shift
          </Typography>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Closing Cash (counted)"
              type="number"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <Button
              variant="contained"
              color="error"
              onClick={handleCloseShift}
            >
              Close Shift
            </Button>
          </Stack>
        </Paper>
      )}

      <CashMovementDialog
        open={showCashDialog}
        onClose={() => setShowCashDialog(false)}
        onSuccess={fetchCurrentShift}
      />
    </Box>
  );
}
