import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Alert,
  Chip,
} from "@mui/material";
import { Print } from "@mui/icons-material";
import { COLORS } from "../pos/PosLayout";
import journalService from "../../services/journalService";

export default function BalanceSheet() {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [trialBalance, setTrialBalance] = useState([]);
  const [retainedEarnings, setRetainedEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (date) => {
    setLoading(true);
    setError("");
    try {
      const [tb, incomeStatement] = await Promise.all([
        journalService.getTrialBalance(date),
        // net profit from inception to `date` becomes Retained Earnings
        journalService.getIncomeStatement(null, date),
      ]);
      setTrialBalance(Array.isArray(tb) ? tb : []);
      setRetainedEarnings(incomeStatement?.netProfit || 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load Balance Sheet");
      setTrialBalance([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(asOf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = useMemo(() => {
    const byType = { Asset: [], Liability: [], Equity: [] };
    trialBalance.forEach((r) => {
      if (byType[r.type]) {
        // Asset balances sit on the debit side; Liability/Equity on credit
        const amount = r.type === "Asset" ? r.debit || 0 : r.credit || 0;
        byType[r.type].push({ code: r.code, name: r.name, amount });
      }
    });
    return byType;
  }, [trialBalance]);

  const totalAssets = sections.Asset.reduce((s, r) => s + r.amount, 0);
  const totalLiabilities = sections.Liability.reduce((s, r) => s + r.amount, 0);
  const totalEquity =
    sections.Equity.reduce((s, r) => s + r.amount, 0) + retainedEarnings;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const balanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

  const renderSection = (title, rows, extraRow, total) => (
    <Paper variant="outlined" sx={{ mb: 3 }}>
      <Box sx={{ p: 1.5, backgroundColor: COLORS?.hoverBg || "#fafafa" }}>
        <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
      </Box>
      <Table size="small">
        <TableBody>
          {rows.length === 0 && !extraRow ? (
            <TableRow>
              <TableCell
                colSpan={2}
                sx={{ textAlign: "center", color: "text.secondary" }}
              >
                No accounts in this section
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.code} hover>
                <TableCell>
                  {r.code} - {r.name}
                </TableCell>
                <TableCell align="right">{r.amount.toLocaleString()}</TableCell>
              </TableRow>
            ))
          )}
          {extraRow && (
            <TableRow hover>
              <TableCell sx={{ fontStyle: "italic" }}>
                {extraRow.name}
              </TableCell>
              <TableCell align="right" sx={{ fontStyle: "italic" }}>
                {extraRow.amount.toLocaleString()}
              </TableCell>
            </TableRow>
          )}
          <TableRow sx={{ borderTop: `1px solid ${COLORS?.border || "#ddd"}` }}>
            <TableCell sx={{ fontWeight: 600 }}>Total {title}</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>
              {total.toLocaleString()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );

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
        <Typography variant="h6">Balance Sheet</Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            label="As of"
            type="date"
            size="small"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="outlined" onClick={() => load(asOf)}>
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

      {loading ? (
        <Typography sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
          Loading...
        </Typography>
      ) : (
        <>
          {renderSection("Assets", sections.Asset, null, totalAssets)}
          {renderSection(
            "Liabilities",
            sections.Liability,
            null,
            totalLiabilities,
          )}
          {renderSection(
            "Equity",
            sections.Equity,
            {
              name: "Retained Earnings (current period)",
              amount: retainedEarnings,
            },
            totalEquity,
          )}

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Assets: {totalAssets.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Liabilities + Equity:{" "}
                {totalLiabilitiesAndEquity.toLocaleString()}
              </Typography>
            </Box>
            <Chip
              label={balanced ? "Balanced" : "Not Balanced — check ledger"}
              color={balanced ? "success" : "error"}
              sx={{ fontSize: 14, px: 1.5, py: 2 }}
            />
          </Paper>
        </>
      )}
    </Box>
  );
}
