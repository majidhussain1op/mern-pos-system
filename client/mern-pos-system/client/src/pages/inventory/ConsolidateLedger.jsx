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
  Autocomplete,
  Button,
  Alert,
  Chip,
  Collapse,
  IconButton,
} from "@mui/material";
import { ExpandMore, ChevronRight, Print } from "@mui/icons-material";
import { COLORS, cellSx } from "../pos/PosLayout";
import accountService from "../../services/accountService";
import journalService from "../../services/journalService";

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function ConsolidatedLedger() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [ledgers, setLedgers] = useState({}); // { [accountId]: { openingBalance, closingBalance, entries } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    accountService
      .getAll()
      .then((data) => setAccounts(data.filter((a) => a.isPostingAccount)))
      .catch(() => setError("Failed to load accounts"));
  }, []);

  const loadLedgers = async () => {
    if (selectedAccounts.length === 0) {
      setError("Select at least one account");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const results = await Promise.all(
        selectedAccounts.map((acc) =>
          journalService
            .getAccountLedger(acc._id, from, to)
            .then((data) => ({ id: acc._id, data })),
        ),
      );
      const map = {};
      results.forEach((r) => (map[r.id] = r.data));
      setLedgers(map);
      const openState = {};
      selectedAccounts.forEach((acc) => (openState[acc._id] = true));
      setExpanded(openState);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

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
        <Typography variant="h6">Consolidated Account Ledger</Typography>
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
            value={selectedAccounts}
            onChange={(e, val) => setSelectedAccounts(val)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Accounts"
                placeholder="Select accounts"
              />
            )}
            sx={{ minWidth: 320, flex: 1 }}
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
          <Button variant="contained" onClick={loadLedgers} disabled={loading}>
            {loading ? "Loading..." : "Show Ledger"}
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {selectedAccounts.map((acc) => {
        const ledger = ledgers[acc._id];
        if (!ledger) return null;
        const isOpen = expanded[acc._id] ?? true;

        return (
          <Paper variant="outlined" key={acc._id} sx={{ mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 1.5,
                backgroundColor: COLORS?.hoverBg || "#fafafa",
                cursor: "pointer",
              }}
              onClick={() => toggle(acc._id)}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton size="small">
                  {isOpen ? (
                    <ExpandMore fontSize="small" />
                  ) : (
                    <ChevronRight fontSize="small" />
                  )}
                </IconButton>
                <Typography sx={{ fontWeight: 600 }}>
                  {acc.code} - {acc.name}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Opening: {(ledger.openingBalance ?? 0).toLocaleString()}
                </Typography>
                <Chip
                  size="small"
                  label={`Closing: ${(ledger.closingBalance ?? 0).toLocaleString()}`}
                  color="primary"
                />
              </Box>
            </Box>

            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={cellSx}>Date</TableCell>
                    <TableCell sx={cellSx}>Type</TableCell>
                    <TableCell sx={cellSx}>Narration</TableCell>
                    <TableCell sx={cellSx} align="right">
                      Debit
                    </TableCell>
                    <TableCell sx={cellSx} align="right">
                      Credit
                    </TableCell>
                    <TableCell sx={cellSx} align="right">
                      Balance
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(ledger.entries || []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        sx={{ textAlign: "center", color: "text.secondary" }}
                      >
                        No transactions in this date range
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledger.entries.map((e, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          {new Date(e.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={e.voucherType || e.reference || "-"}
                          />
                        </TableCell>
                        <TableCell>{e.narration}</TableCell>
                        <TableCell align="right">
                          {e.debit ? e.debit.toLocaleString() : ""}
                        </TableCell>
                        <TableCell align="right">
                          {e.credit ? e.credit.toLocaleString() : ""}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>
                          {e.runningBalance?.toLocaleString?.() ?? ""}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Collapse>
          </Paper>
        );
      })}

      {selectedAccounts.length > 0 &&
        Object.keys(ledgers).length === 0 &&
        !loading && (
          <Typography
            sx={{ p: 3, textAlign: "center", color: "text.secondary" }}
          >
            Click "Show Ledger" to load transactions for the selected accounts.
          </Typography>
        )}
    </Box>
  );
}
