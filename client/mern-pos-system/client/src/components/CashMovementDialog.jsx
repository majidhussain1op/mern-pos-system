import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
} from "@mui/material";
import { fieldSx } from "../../src/pages/pos/PosLayout";
import shiftService from "../services/ShiftServices";

export default function CashMovementDialog({ open, onClose, onSuccess }) {
  const [type, setType] = useState("CASH_IN");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetAndClose = () => {
    setType("CASH_IN");
    setAmount("");
    setReason("");
    setError("");
    onClose();
  };

  const handleSubmit = async () => {
    setError("");

    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required");
      return;
    }

    try {
      setLoading(true);
      await shiftService.recordCashMovement(
        type,
        Number(amount),
        reason.trim(),
      );
      resetAndClose();
      onSuccess?.();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to record cash movement",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={resetAndClose} fullWidth maxWidth="xs">
      <DialogTitle>Cash In / Cash Out</DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
      >
        {error && <Alert severity="error">{error}</Alert>}

        <ToggleButtonGroup
          color="primary"
          exclusive
          fullWidth
          value={type}
          onChange={(e, val) => val && setType(val)}
        >
          <ToggleButton value="CASH_IN">Cash In</ToggleButton>
          <ToggleButton value="CASH_OUT">Cash Out</ToggleButton>
        </ToggleButtonGroup>

        <TextField
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          sx={fieldSx}
          fullWidth
        />

        <TextField
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={fieldSx}
          fullWidth
          multiline
          minRows={2}
          placeholder={
            type === "CASH_IN"
              ? "e.g. Owner deposited extra float"
              : "e.g. Paid supplier / petty expense"
          }
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={resetAndClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
