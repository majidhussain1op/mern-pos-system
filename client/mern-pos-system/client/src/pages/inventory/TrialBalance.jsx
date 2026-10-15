import React, { useEffect, useMemo, useState } from "react";
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
  Alert,
  Chip,
  Button,
} from "@mui/material";
import { Print } from "@mui/icons-material";
import { COLORS, cellSx } from "../pos/PosLayout";
import journalService from "../../services/journalService";

const TYPE_ORDER = ["Asset", "Liability", "Equity", "Income", "Expense"];

export default function TrialBalance() {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async (date) => {
    setLoading(true);
    setError("");
    try {
      const data = await journalService.getTrialBalance(date);
      console.log("TB response:", data); // debug ke liye — response shape confirm hone ke baad hata dena
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load Trial Balance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(asOf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const map = {};
    TYPE_ORDER.forEach((t) => (map[t] = []));
    rows.forEach((r) => {
      if (!map[r.type]) map[r.type] = [];
      map[r.type].push(r);
    });
    return map;
  }, [rows]);

  const totals = useMemo(() => {
    const debit = rows.reduce((sum, r) => sum + (r.debit || 0), 0);
    const credit = rows.reduce((sum, r) => sum + (r.credit || 0), 0);
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.01 };
  }, [rows]);

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
        <Typography variant="h6">Trial Balance</Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            label="As of"
            type="date"
            size="small"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="outlined" onClick={() => loadData(asOf)}>
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined">
        {loading ? (
          <Typography
            sx={{ p: 3, textAlign: "center", color: "text.secondary" }}
          >
            Loading...
          </Typography>
        ) : rows.length === 0 ? (
          <Typography
            sx={{ p: 3, textAlign: "center", color: "text.secondary" }}
          >
            No account balances found as of this date.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={cellSx}>Code</TableCell>
                <TableCell sx={cellSx}>Account</TableCell>
                <TableCell sx={cellSx} align="right">
                  Debit
                </TableCell>
                <TableCell sx={cellSx} align="right">
                  Credit
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {TYPE_ORDER.map((type) => {
                const typeRows = grouped[type] || [];
                if (typeRows.length === 0) return null;
                const typeDebit = typeRows.reduce(
                  (s, r) => s + (r.debit || 0),
                  0,
                );
                const typeCredit = typeRows.reduce(
                  (s, r) => s + (r.credit || 0),
                  0,
                );
                return (
                  <React.Fragment key={type}>
                    <TableRow
                      sx={{ backgroundColor: COLORS?.hoverBg || "#fafafa" }}
                    >
                      <TableCell colSpan={4} sx={{ fontWeight: 600 }}>
                        {type}
                      </TableCell>
                    </TableRow>
                    {typeRows.map((r) => (
                      <TableRow key={r._id} hover>
                        <TableCell
                          sx={{
                            fontFamily: "monospace",
                            color: "text.secondary",
                          }}
                        >
                          {r.code}
                        </TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell align="right">
                          {r.debit ? r.debit.toLocaleString() : ""}
                        </TableCell>
                        <TableCell align="right">
                          {r.credit ? r.credit.toLocaleString() : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        sx={{ color: "text.secondary", fontStyle: "italic" }}
                      >
                        {type} subtotal
                      </TableCell>
                      <TableCell align="right" sx={{ fontStyle: "italic" }}>
                        {typeDebit.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontStyle: "italic" }}>
                        {typeCredit.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
              <TableRow
                sx={{ borderTop: `2px solid ${COLORS?.border || "#333"}` }}
              >
                <TableCell colSpan={2} sx={{ fontWeight: 700 }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {totals.debit.toLocaleString()}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {totals.credit.toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Paper>

      {!loading && rows.length > 0 && (
        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <Chip
            label={totals.balanced ? "Balanced" : "Not Balanced — check ledger"}
            color={totals.balanced ? "success" : "error"}
          />
        </Box>
      )}
    </Box>
  );
}
