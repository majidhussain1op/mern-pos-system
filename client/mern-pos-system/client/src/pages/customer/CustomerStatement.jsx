import { useState } from "react";
import useSWR from "swr";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PaymentsIcon from "@mui/icons-material/Payments";
import { getStatement, receivePayment } from "../../services/CustomerApi";
import { COLORS } from "../../pages/pos/PosLayout";

export default function CustomerStatement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, mutate } = useSWR(
    id ? `statement-${id}` : null,
    () => getStatement(id),
  );

  const [openPay, setOpenPay] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const customer = data?.customer;
  const entries = data?.entries || [];

  const handleReceivePayment = async () => {
    setError("");
    if (!amount || Number(amount) <= 0) {
      setError("Amount valid honi chahiye");
      return;
    }
    setSaving(true);
    try {
      await receivePayment(id, { amount: Number(amount), note });
      await mutate();
      setAmount("");
      setNote("");
      setOpenPay(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Payment receive nahi hui");
    } finally {
      setSaving(false);
    }
  };

  const handleClosePay = () => {
    setOpenPay(false);
    setAmount("");
    setNote("");
    setError("");
  };

  if (isLoading) return <Box sx={{ p: 2 }}>Loading...</Box>;

  if (!customer) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Customer nahi mila</Typography>
        <Button onClick={() => navigate(-1)} sx={{ mt: 1 }}>
          Wapis Jao
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>
          {customer.name}'s Statement
        </Typography>
      </Stack>

      {/* Customer info + balance */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          bgcolor: COLORS.totalBox2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#fff",
        }}
      >
        <Box>
          <Typography variant="body2">
            {customer.phone || "No phone"}{" "}
            {customer.address ? `• ${customer.address}` : ""}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Current Balance
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            Rs. {customer.balance?.toLocaleString() || 0}
          </Typography>
        </Box>
        <Button
          variant="contained"
          sx={{
            bgcolor: "#fff",
            color: COLORS.totalBox2,
            "&:hover": { bgcolor: "#f0f0f0" },
          }}
          startIcon={<PaymentsIcon />}
          onClick={() => setOpenPay(true)}
        >
          Receive Payment
        </Button>
      </Paper>

      {/* Statement table */}
      <Paper sx={{ border: `1px solid ${COLORS.border}` }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: COLORS.header }}>
              <TableCell sx={{ color: "#fff" }}>Date</TableCell>
              <TableCell sx={{ color: "#fff" }}>Type</TableCell>
              <TableCell sx={{ color: "#fff" }}>Reference</TableCell>
              <TableCell sx={{ color: "#fff" }} align="right">
                Debit
              </TableCell>
              <TableCell sx={{ color: "#fff" }} align="right">
                Credit
              </TableCell>
              <TableCell sx={{ color: "#fff" }} align="right">
                Balance
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Koi transaction nahi hai
                </TableCell>
              </TableRow>
            )}
            {entries.map((e) => (
              <TableRow key={e._id} hover>
                <TableCell>
                  {new Date(e.createdAt).toLocaleDateString()}{" "}
                  <Typography
                    component="span"
                    sx={{ fontSize: 11, color: "text.secondary" }}
                  >
                    {new Date(e.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={e.type}
                    color={
                      e.type === "SALE"
                        ? "warning"
                        : e.type === "PAYMENT_IN"
                          ? "success"
                          : e.type === "PAYMENT_OUT"
                            ? "info"
                            : "default"
                    }
                  />
                </TableCell>
                <TableCell>{e.reference || e.note || "-"}</TableCell>
                <TableCell align="right">
                  {e.debit ? `Rs. ${e.debit.toLocaleString()}` : "-"}
                </TableCell>
                <TableCell align="right">
                  {e.credit ? `Rs. ${e.credit.toLocaleString()}` : "-"}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Rs. {e.balanceAfter.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Receive Payment Dialog */}
      <Dialog open={openPay} onClose={handleClosePay} fullWidth maxWidth="xs">
        <DialogTitle>Receive Payment — {customer.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Current balance: Rs. {customer.balance?.toLocaleString() || 0}
            </Typography>
            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              fullWidth
            />
            <TextField
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
            />
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePay}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleReceivePayment}
            disabled={saving}
          >
            {saving ? "Saving..." : "Receive"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
