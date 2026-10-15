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
  IconButton,
  Button,
  Chip,
  Alert,
  Collapse,
  Autocomplete,
} from "@mui/material";
import {
  Add,
  Delete as DeleteOutline,
  ExpandMore,
  ChevronRight,
} from "@mui/icons-material";
import { COLORS, cellSx, fieldSx } from "../pos/PosLayout";
import accountService from "../../services/AccountingServices";
import journalEntryService from "../../services/journalEntryService";

const VOUCHER_TYPES = ["Journal", "Payment", "Receipt", "Contra"];

const emptyLine = () => ({
  key: Math.random().toString(36).slice(2),
  account: null,
  debit: "",
  credit: "",
  narration: "",
});

export default function VoucherEntry() {
  const [accounts, setAccounts] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [voucherType, setVoucherType] = useState("Journal");
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    accountService
      .getAll()
      .then((data) => setAccounts(data.filter((a) => a.isPostingAccount)))
      .catch(() => setError("Failed to load accounts"));
    loadRecent();
  }, []);

  const loadRecent = async () => {
    setRecentLoading(true);
    try {
      const data = await journalEntryService.getAll({ limit: 15 });
      setRecent(data);
    } catch {
      // non-fatal — the form above still works without the recent list
    } finally {
      setRecentLoading(false);
    }
  };

  const totals = useMemo(() => {
    const debit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
    const credit = lines.reduce(
      (sum, l) => sum + (parseFloat(l.credit) || 0),
      0,
    );
    return {
      debit,
      credit,
      balanced: debit > 0 && Math.abs(debit - credit) < 0.01,
    };
  }, [lines]);

  const updateLine = (key, field, value) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        // a line is either a debit or a credit, not both
        if (field === "debit" && value)
          return { ...l, debit: value, credit: "" };
        if (field === "credit" && value)
          return { ...l, credit: value, debit: "" };
        return { ...l, [field]: value };
      }),
    );
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (key) => {
    if (lines.length <= 2) return; // a voucher needs at least 2 lines
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const resetForm = () => {
    setNarration("");
    setLines([emptyLine(), emptyLine()]);
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    const filledLines = lines.filter((l) => l.account && (l.debit || l.credit));
    if (filledLines.length < 2) {
      setError("Add at least two lines with an account and an amount");
      return;
    }
    if (!totals.balanced) {
      setError(
        `Debit (${totals.debit}) and Credit (${totals.credit}) must be equal`,
      );
      return;
    }

    setSaving(true);
    try {
      await journalEntryService.create({
        date,
        voucherType,
        narration,
        lines: filledLines.map((l) => ({
          account: l.account._id,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          narration: l.narration,
        })),
      });
      setSuccess("Voucher posted successfully");
      resetForm();
      loadRecent();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to post voucher");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    if (entry.refType !== "Manual") return;
    if (
      !window.confirm(
        "Delete this voucher? This will reverse its balance impact.",
      )
    )
      return;
    try {
      await journalEntryService.remove(entry._id);
      loadRecent();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete voucher");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Voucher Entry
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 4 }}>
        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ ...fieldSx, width: 180 }}
          />
          <TextField
            select
            label="Voucher Type"
            value={voucherType}
            onChange={(e) => setVoucherType(e.target.value)}
            sx={{ ...fieldSx, width: 180 }}
          >
            {VOUCHER_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Narration / Reference"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            sx={{ ...fieldSx, flex: 1, minWidth: 240 }}
          />
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={cellSx}>Account</TableCell>
              <TableCell sx={cellSx} width={130}>
                Debit
              </TableCell>
              <TableCell sx={cellSx} width={130}>
                Credit
              </TableCell>
              <TableCell sx={cellSx}>Line Narration</TableCell>
              <TableCell sx={cellSx} width={50} />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.key}>
                <TableCell>
                  <Autocomplete
                    size="small"
                    options={accounts}
                    getOptionLabel={(a) => `${a.code} - ${a.name}`}
                    value={line.account}
                    onChange={(e, val) => updateLine(line.key, "account", val)}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Select account" />
                    )}
                    sx={{ minWidth: 220 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    value={line.debit}
                    onChange={(e) =>
                      updateLine(line.key, "debit", e.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    value={line.credit}
                    onChange={(e) =>
                      updateLine(line.key, "credit", e.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={line.narration}
                    onChange={(e) =>
                      updateLine(line.key, "narration", e.target.value)
                    }
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => removeLine(line.key)}
                    disabled={lines.length <= 2}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Button startIcon={<Add />} onClick={addLine} sx={{ mt: 1 }}>
          Add Line
        </Button>

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 3,
            mt: 2,
            alignItems: "center",
          }}
        >
          <Typography>Debit: {totals.debit.toLocaleString()}</Typography>
          <Typography>Credit: {totals.credit.toLocaleString()}</Typography>
          <Chip
            label={totals.balanced ? "Balanced" : "Not Balanced"}
            color={totals.balanced ? "success" : "error"}
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !totals.balanced}
          >
            {saving ? "Posting..." : "Post Voucher"}
          </Button>
        </Box>
      </Paper>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Recent Vouchers
      </Typography>
      <Paper variant="outlined">
        {recentLoading ? (
          <Typography
            sx={{ p: 3, textAlign: "center", color: "text.secondary" }}
          >
            Loading...
          </Typography>
        ) : recent.length === 0 ? (
          <Typography
            sx={{ p: 3, textAlign: "center", color: "text.secondary" }}
          >
            No vouchers yet.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={cellSx} width={40} />
                <TableCell sx={cellSx}>Date</TableCell>
                <TableCell sx={cellSx}>Type</TableCell>
                <TableCell sx={cellSx}>Narration</TableCell>
                <TableCell sx={cellSx} align="right">
                  Amount
                </TableCell>
                <TableCell sx={cellSx} width={50} />
              </TableRow>
            </TableHead>
            <TableBody>
              {recent.map((entry) => {
                const isOpen = expandedRow === entry._id;
                const amount = (entry.lines || []).reduce(
                  (sum, l) => sum + (l.debit || 0),
                  0,
                );
                return (
                  <React.Fragment key={entry._id}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setExpandedRow(isOpen ? null : entry._id)
                          }
                        >
                          {isOpen ? (
                            <ExpandMore fontSize="small" />
                          ) : (
                            <ChevronRight fontSize="small" />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        {new Date(entry.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={entry.voucherType || entry.refType}
                        />
                      </TableCell>
                      <TableCell>{entry.narration}</TableCell>
                      <TableCell align="right">
                        {amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {entry.refType === "Manual" && (
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(entry)}
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0, border: 0 }}>
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <Box
                            sx={{
                              p: 1.5,
                              backgroundColor: COLORS?.hoverBg || "#fafafa",
                            }}
                          >
                            <Table size="small">
                              <TableBody>
                                {(entry.lines || []).map((l, i) => (
                                  <TableRow key={i}>
                                    <TableCell>
                                      {l.account?.code} - {l.account?.name}
                                    </TableCell>
                                    <TableCell align="right">
                                      {l.debit
                                        ? `Dr ${l.debit.toLocaleString()}`
                                        : ""}
                                    </TableCell>
                                    <TableCell align="right">
                                      {l.credit
                                        ? `Cr ${l.credit.toLocaleString()}`
                                        : ""}
                                    </TableCell>
                                    <TableCell>{l.narration}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}
