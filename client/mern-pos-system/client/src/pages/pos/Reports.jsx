import { useState, useEffect } from "react";
import { Box, Paper, Typography, TextField, Button, Grid } from "@mui/material";
import PosLayout, { fieldSx } from "./PosLayout";
import api from "../../services/api";

function Card({ label, value, color }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, textAlign: "center", borderTop: `4px solid ${color}` }}
    >
      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 700 }}>{value}</Typography>
    </Paper>
  );
}

const DEFAULT_SUMMARY = {
  totalSales: 0,
  totalReceivable: 0,
  totalPurchases: 0,
  totalPayable: 0,
  billCount: 0,
  lowStockCount: 0,
};

const DEFAULT_PROFIT = {
  totalRevenue: 0,
  totalCost: 0,
  grossProfit: 0,
};

export default function Reports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [profit, setProfit] = useState(DEFAULT_PROFIT);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const qs = `${from ? `from=${from}&` : ""}${to ? `to=${to}` : ""}`;
      const [s, p] = await Promise.all([
        api.get(`/reports/summary?${qs}`),
        api.get(`/reports/profit?${qs}`),
      ]);
      setSummary({ ...DEFAULT_SUMMARY, ...s.data.summary });
      setProfit({ ...DEFAULT_PROFIT, ...p.data.report });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const num = (v) => (typeof v === "number" ? v : 0);

  return (
    <PosLayout>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
          <Box>
            <Typography sx={{ fontSize: 12 }}>From</Typography>
            <TextField
              size="small"
              type="date"
              sx={fieldSx}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12 }}>To</Typography>
            <TextField
              size="small"
              type="date"
              sx={fieldSx}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Box>
          <Button variant="contained" onClick={load}>
            Apply
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={2}>
          <Card
            label="Total Sales"
            value={num(summary.totalSales).toFixed(0)}
            color="#1565c0"
          />
        </Grid>
        <Grid item xs={6} md={2}>
          <Card label="Bills" value={num(summary.billCount)} color="#1565c0" />
        </Grid>
        <Grid item xs={6} md={2}>
          <Card
            label="Receivable"
            value={num(summary.totalReceivable).toFixed(0)}
            color="#c62828"
          />
        </Grid>
        <Grid item xs={6} md={2}>
          <Card
            label="Total Purchases"
            value={num(summary.totalPurchases).toFixed(0)}
            color="#7a1f1f"
          />
        </Grid>
        <Grid item xs={6} md={2}>
          <Card
            label="Payable"
            value={num(summary.totalPayable).toFixed(0)}
            color="#c77a1f"
          />
        </Grid>
        <Grid item xs={6} md={2}>
          <Card
            label="Low Stock Items"
            value={num(summary.lowStockCount)}
            color="#e53935"
          />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Profit Report</Typography>
        {loading ? (
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            Loading...
          </Typography>
        ) : (
          <>
            <Typography sx={{ fontSize: 13 }}>
              Revenue: {num(profit.totalRevenue).toFixed(2)}
            </Typography>
            <Typography sx={{ fontSize: 13 }}>
              Cost: {num(profit.totalCost).toFixed(2)}
            </Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 700, mt: 1 }}>
              Gross Profit: {num(profit.grossProfit).toFixed(2)}
            </Typography>
          </>
        )}
      </Paper>
    </PosLayout>
  );
}
