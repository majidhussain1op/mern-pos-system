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
  Button,
  Alert,
  Chip,
} from "@mui/material";
import { Print } from "@mui/icons-material";
import { COLORS } from "../pos/PosLayout";
import journalService from "../../services/journalService";

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function IncomeStatement() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await journalService.getIncomeStatement(from, to);
      setReport(data);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load Income Statement",
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const income = report?.income || [];
  const expense = report?.expense || [];
  const totalIncome =
    report?.totalIncome ?? income.reduce((s, r) => s + (r.amount || 0), 0);
  const totalExpense =
    report?.totalExpense ?? expense.reduce((s, r) => s + (r.amount || 0), 0);
  const netProfit = report?.netProfit ?? totalIncome - totalExpense;

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
        <Typography variant="h6">Income Statement</Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
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
          <Button variant="outlined" onClick={load}>
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
          <Paper variant="outlined" sx={{ mb: 3 }}>
            <Box sx={{ p: 1.5, backgroundColor: COLORS?.hoverBg || "#fafafa" }}>
              <Typography sx={{ fontWeight: 600 }}>Income</Typography>
            </Box>
            <Table size="small">
              <TableBody>
                {income.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      sx={{ textAlign: "center", color: "text.secondary" }}
                    >
                      No income recorded in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  income.map((r) => (
                    <TableRow key={r.code} hover>
                      <TableCell>
                        {r.code} - {r.name}
                      </TableCell>
                      <TableCell align="right">
                        {(r.amount || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow
                  sx={{ borderTop: `1px solid ${COLORS?.border || "#ddd"}` }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>Total Income</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {totalIncome.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>

          <Paper variant="outlined" sx={{ mb: 3 }}>
            <Box sx={{ p: 1.5, backgroundColor: COLORS?.hoverBg || "#fafafa" }}>
              <Typography sx={{ fontWeight: 600 }}>Expenses</Typography>
            </Box>
            <Table size="small">
              <TableBody>
                {expense.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      sx={{ textAlign: "center", color: "text.secondary" }}
                    >
                      No expenses recorded in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  expense.map((r) => (
                    <TableRow key={r.code} hover>
                      <TableCell>
                        {r.code} - {r.name}
                      </TableCell>
                      <TableCell align="right">
                        {(r.amount || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow
                  sx={{ borderTop: `1px solid ${COLORS?.border || "#ddd"}` }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>Total Expenses</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {totalExpense.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">
              {netProfit >= 0 ? "Net Profit" : "Net Loss"}
            </Typography>
            <Chip
              label={Math.abs(netProfit).toLocaleString()}
              color={netProfit >= 0 ? "success" : "error"}
              sx={{ fontSize: 16, px: 2, py: 2.5 }}
            />
          </Paper>
        </>
      )}
    </Box>
  );
}
