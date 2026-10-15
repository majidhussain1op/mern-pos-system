import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Autocomplete,
  Button,
  Alert,
  Chip,
} from "@mui/material";
import { Print } from "@mui/icons-material";
import { COLORS } from "../pos/PosLayout";
import accountService from "../../services/accountService";
import journalService from "../../services/journalService";

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

const SECTION_LABELS = {
  operating: "Operating Activities",
  investing: "Investing Activities",
  financing: "Financing Activities",
};

export default function CashFlowStatement() {
  const [accounts, setAccounts] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    accountService
      .getAll()
      .then((data) =>
        setAccounts(
          Array.isArray(data) ? data.filter((a) => a.isPostingAccount) : [],
        ),
      )
      .catch(() => setError("Failed to load accounts"));
  }, []);

  const load = async () => {
    if (cashAccounts.length === 0) {
      setError("Select at least one Cash/Bank account");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await journalService.getCashFlow(
        cashAccounts.map((a) => a._id),
        from,
        to,
      );
      setReport(data);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load Cash Flow Statement",
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (key) => {
    const rows = report?.[key] || [];
    const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
    return (
      <Paper variant="outlined" sx={{ mb: 3 }} key={key}>
        <Box sx={{ p: 1.5, backgroundColor: COLORS?.hoverBg || "#fafafa" }}>
          <Typography sx={{ fontWeight: 600 }}>
            {SECTION_LABELS[key]}
          </Typography>
        </Box>
        <Table size="small">
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  sx={{ textAlign: "center", color: "text.secondary" }}
                >
                  No activity in this period
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={i} hover>
                  <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                  <TableCell>{r.counterAccount}</TableCell>
                  <TableCell align="right">
                    {r.amount >= 0
                      ? r.amount.toLocaleString()
                      : `(${Math.abs(r.amount).toLocaleString()})`}
                  </TableCell>
                </TableRow>
              ))
            )}
            <TableRow
              sx={{ borderTop: `1px solid ${COLORS?.border || "#ddd"}` }}
            >
              <TableCell colSpan={2} sx={{ fontWeight: 600 }}>
                Net Cash from {SECTION_LABELS[key]}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {total >= 0
                  ? total.toLocaleString()
                  : `(${Math.abs(total).toLocaleString()})`}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    );
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
        <Typography variant="h6">Cash Flow Statement</Typography>
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
          <Autocomplete
            multiple
            size="small"
            options={accounts}
            getOptionLabel={(a) => `${a.code} - ${a.name}`}
            value={cashAccounts}
            onChange={(e, val) => setCashAccounts(val)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Cash & Bank Accounts"
                placeholder="Select accounts"
              />
            )}
            sx={{ minWidth: 300, flex: 1 }}
          />
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
          <Button variant="contained" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Generate"}
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {report && (
        <>
          {["operating", "investing", "financing"].map(renderSection)}

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Opening Cash Balance
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {(report.openingCashBalance ?? 0).toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Net Change in Cash
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {(report.netChange ?? 0).toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: `1px solid ${COLORS?.border || "#ddd"}`,
                pt: 1,
              }}
            >
              <Typography variant="h6">Closing Cash Balance</Typography>
              <Chip
                label={(report.closingCashBalance ?? 0).toLocaleString()}
                color="primary"
                sx={{ fontSize: 15, px: 1.5, py: 2 }}
              />
            </Box>
          </Paper>
        </>
      )}

      {!report && !loading && (
        <Typography sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
          Select Cash/Bank accounts and a date range, then click "Generate".
        </Typography>
      )}
    </Box>
  );
}
