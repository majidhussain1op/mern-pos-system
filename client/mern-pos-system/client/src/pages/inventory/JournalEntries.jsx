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
  TextField,
  MenuItem,
  Stack,
  Chip,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { cellSx, fieldSx } from "../pos/PosLayout";
import accountingService from "../../services/AccountingServices";

const REF_TYPE_COLOR = {
  Sale: "success",
  SaleVoid: "error",
  Purchase: "primary",
  PurchaseReturn: "warning",
  PaymentIn: "success",
  PaymentOut: "warning",
  Manual: "default",
};

const emptyLine = { accountCode: "", debit: "", credit: "" };

export default function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [refType, setRefType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState([{ ...emptyLine }, { ...emptyLine }]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (refType) params.refType = refType;
      if (from) params.from = from;
      if (to) params.to = to;
      const [entriesRes, coaRes] = await Promise.all([
        accountingService.getJournalEntries(params),
        accountingService.getChartOfAccounts(),
      ]);
      setEntries(entriesRes.data.data || entriesRes.data.entries || []);
      setAccounts(coaRes.data.accounts);
      setError("");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load journal entries",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refType, from, to]);

  const updateLine = (idx, field, value) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      // ek line mein debit aur credit dono nahi ho sakte
      if (field === "debit" && value) updated[idx].credit = "";
      if (field === "credit" && value) updated[idx].debit = "";
      return updated;
    });
  };

  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (idx) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced =
    Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const resetForm = () => {
    setDescription("");
    setLines([{ ...emptyLine }, { ...emptyLine }]);
  };

  const submitEntry = async () => {
    if (!isBalanced) {
      return alert(
        "Debit aur Credit total barabar honi chahiye (aur 0 se zyada)",
      );
    }
    setSaving(true);
    try {
      await accountingService.createManualEntry({
        description,
        lines: lines
          .filter(
            (l) =>
              l.accountCode && (Number(l.debit) > 0 || Number(l.credit) > 0),
          )
          .map((l) => ({
            accountCode: l.accountCode,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
          })),
      });
      setCreateOpen(false);
      resetForm();
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Entry save nahi ho saki");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id) => {
    if (
      !window.confirm(
        "Ye manual entry delete karni hai? Account balances reverse ho jayenge.",
      )
    )
      return;
    try {
      await accountingService.deleteManualEntry(id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          Journal Entries
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateOpen(true)}
        >
          Manual Entry
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          label="Type"
          value={refType}
          onChange={(e) => setRefType(e.target.value)}
          sx={{ ...fieldSx, width: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Sale">Sale</MenuItem>
          <MenuItem value="SaleVoid">Sale Void</MenuItem>
          <MenuItem value="Purchase">Purchase</MenuItem>
          <MenuItem value="PurchaseReturn">Purchase Return</MenuItem>
          <MenuItem value="PaymentIn">Payment In</MenuItem>
          <MenuItem value="PaymentOut">Payment Out</MenuItem>
          <MenuItem value="Manual">Manual</MenuItem>
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
              <TableCell sx={cellSx}>Entry #</TableCell>
              <TableCell sx={cellSx}>Date</TableCell>
              <TableCell sx={cellSx}>Description</TableCell>
              <TableCell sx={cellSx}>Lines</TableCell>
              <TableCell sx={cellSx}>Type</TableCell>
              <TableCell sx={cellSx}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} sx={cellSx}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={cellSx}>
                  Koi entry nahi mili
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell sx={cellSx}>{entry.entryNo}</TableCell>
                  <TableCell sx={cellSx}>
                    {new Date(entry.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={cellSx}>{entry.description}</TableCell>
                  <TableCell sx={cellSx}>
                    {entry.lines.map((l, i) => (
                      <div key={i} style={{ fontSize: 11 }}>
                        {l.account?.code} {l.account?.name}:{" "}
                        {l.debit > 0 ? `Dr ${l.debit}` : `Cr ${l.credit}`}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <Chip
                      label={entry.refType}
                      size="small"
                      color={REF_TYPE_COLOR[entry.refType]}
                    />
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {entry.refType === "Manual" && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteEntry(entry._id)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Manual Entry Create Dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>New Manual Journal Entry</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="Description"
            size="small"
            fullWidth
            sx={{ ...fieldSx, mb: 2 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={cellSx}>Account</TableCell>
                <TableCell sx={cellSx}>Debit</TableCell>
                <TableCell sx={cellSx}>Credit</TableCell>
                <TableCell sx={cellSx}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line, idx) => (
                <TableRow key={idx}>
                  <TableCell sx={cellSx}>
                    <TextField
                      select
                      size="small"
                      sx={{ ...fieldSx, width: 200 }}
                      value={line.accountCode}
                      onChange={(e) =>
                        updateLine(idx, "accountCode", e.target.value)
                      }
                    >
                      <MenuItem value="">Select...</MenuItem>
                      {accounts.map((a) => (
                        <MenuItem key={a.code} value={a.code}>
                          {a.code} - {a.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <TextField
                      size="small"
                      type="number"
                      sx={{ ...fieldSx, width: 100 }}
                      value={line.debit}
                      onChange={(e) => updateLine(idx, "debit", e.target.value)}
                    />
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <TextField
                      size="small"
                      type="number"
                      sx={{ ...fieldSx, width: 100 }}
                      value={line.credit}
                      onChange={(e) =>
                        updateLine(idx, "credit", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {lines.length > 2 && (
                      <IconButton size="small" onClick={() => removeLine(idx)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button
            size="small"
            startIcon={<Add />}
            onClick={addLine}
            sx={{ mt: 1 }}
          >
            Add Line
          </Button>

          <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 13 }}>
              Total Debit: {totalDebit.toFixed(2)} | Total Credit:{" "}
              {totalCredit.toFixed(2)}
            </Typography>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 700,
                color: isBalanced ? "#2e7d32" : "#c62828",
              }}
            >
              {isBalanced ? "Balanced ✓" : "Not Balanced"}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submitEntry}
            disabled={saving || !isBalanced}
          >
            {saving ? "Saving..." : "Post Entry"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
