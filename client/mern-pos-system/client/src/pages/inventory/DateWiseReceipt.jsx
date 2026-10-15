import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Alert,
  Chip,
} from "@mui/material";
import { Print } from "@mui/icons-material";
import { COLORS, cellSx } from "../pos/PosLayout";
import journalEntryService from "../../services/journalEntryService";

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

const TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "Receipt", label: "Receipt Only" },
  { value: "Payment", label: "Payment Only" },
];

export default function DateWiseReceiptPayment() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [voucherType, setVoucherType] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await journalEntryService.getAll({
        from,
        to,
        ...(voucherType ? { voucherType } : {}),
      });
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load entries");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only Receipt/Payment vouchers are relevant to this report
  const filtered = useMemo(
    () =>
      entries.filter(
        (e) => e.voucherType === "Receipt" || e.voucherType === "Payment",
      ),
    [entries],
  );

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      const dateKey = new Date(e.date).toLocaleDateString();
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(e);
    });
    return Object.entries(map).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [filtered]);

  const amountOf = (entry) =>
    (entry.lines || []).reduce((s, l) => s + (l.debit || 0), 0);

  const totalReceipts = filtered
    .filter((e) => e.voucherType === "Receipt")
    .reduce((s, e) => s + amountOf(e), 0);
  const totalPayments = filtered
    .filter((e) => e.voucherType === "Payment")
    .reduce((s, e) => s + amountOf(e), 0);

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
        <Typography variant="h6">Date Wise Receipt / Payment</Typography>
        <Button
          variant="outlined"
          startIcon={<Print />}
          onClick={() => window.print()}
        >
          Print
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            label="From"
            type="date"
            size="small"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            label="Type"
            size="small"
            value={voucherType}
            onChange={(e) => setVoucherType(e.target.value)}
            sx={{ width: 160 }}
          >
            {TYPE_FILTERS.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Chip
          label={`Total Receipts: ${totalReceipts.toLocaleString()}`}
          color="success"
        />
        <Chip
          label={`Total Payments: ${totalPayments.toLocaleString()}`}
          color="error"
        />
        <Chip
          label={`Net: ${(totalReceipts - totalPayments).toLocaleString()}`}
          color={totalReceipts - totalPayments >= 0 ? "success" : "error"}
          variant="outlined"
        />
      </Box>

      {loading ? (
        <Typography sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
          Loading...
        </Typography>
      ) : grouped.length === 0 ? (
        <Paper variant="outlined">
          <Typography
            sx={{ p: 3, textAlign: "center", color: "text.secondary" }}
          >
            No Receipt/Payment vouchers in this date range.
          </Typography>
        </Paper>
      ) : (
        grouped.map(([dateKey, dayEntries]) => {
          const dayReceipts = dayEntries
            .filter((e) => e.voucherType === "Receipt")
            .reduce((s, e) => s + amountOf(e), 0);
          const dayPayments = dayEntries
            .filter((e) => e.voucherType === "Payment")
            .reduce((s, e) => s + amountOf(e), 0);

          return (
            <Paper variant="outlined" key={dateKey} sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 1.5,
                  backgroundColor: COLORS?.hoverBg || "#fafafa",
                }}
              >
                <Typography sx={{ fontWeight: 600 }}>{dateKey}</Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
                  {dayReceipts > 0 && (
                    <Typography variant="body2" sx={{ color: "#2e7d32" }}>
                      Receipts: {dayReceipts.toLocaleString()}
                    </Typography>
                  )}
                  {dayPayments > 0 && (
                    <Typography variant="body2" sx={{ color: "#c62828" }}>
                      Payments: {dayPayments.toLocaleString()}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={cellSx}>Type</TableCell>
                    <TableCell sx={cellSx}>Narration</TableCell>
                    <TableCell sx={cellSx}>Account(s)</TableCell>
                    <TableCell sx={cellSx} align="right">
                      Amount
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dayEntries.map((e) => (
                    <TableRow key={e._id} hover>
                      <TableCell>
                        <Chip
                          size="small"
                          label={e.voucherType}
                          color={
                            e.voucherType === "Receipt" ? "success" : "error"
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{e.narration}</TableCell>
                      <TableCell>
                        {(e.lines || [])
                          .map((l) => l.account?.name || l.account?.code)
                          .filter(Boolean)
                          .join(", ")}
                      </TableCell>
                      <TableCell align="right">
                        {amountOf(e).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          );
        })
      )}
    </Box>
  );
}
