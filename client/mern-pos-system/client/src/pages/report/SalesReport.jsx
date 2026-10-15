import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Stack,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Alert,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cellSx, fieldSx } from "../pos/PosLayout";
import reportService from "../../services/ReportServices";

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

const DEFAULT_TOTALS = {
  totalSales: 0,
  totalReceived: 0,
  totalReceivable: 0,
  billCount: 0,
};

export default function SalesReport() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [groupBy, setGroupBy] = useState("day");

  const [timeline, setTimeline] = useState([]);
  const [byPaymentType, setByPaymentType] = useState([]);
  const [totals, setTotals] = useState(DEFAULT_TOTALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const params = { groupBy };
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await reportService.getSalesReport(params);
      setTimeline(res.data.data.timeline);
      setByPaymentType(res.data.data.byPaymentType);
      setTotals({ ...DEFAULT_TOTALS, ...res.data.data.totals });
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load sales report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, groupBy]);

  const num = (v) => (typeof v === "number" ? v : 0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Sales Report
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
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
        <TextField
          select
          label="Group By"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value)}
          sx={{ ...fieldSx, width: 140 }}
        >
          <MenuItem value="day">Daily</MenuItem>
          <MenuItem value="month">Monthly</MenuItem>
        </TextField>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card
            label="Total Sales"
            value={num(totals.totalSales).toFixed(0)}
            color="#1565c0"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Card
            label="Total Received"
            value={num(totals.totalReceived).toFixed(0)}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Card
            label="Receivable (Pending)"
            value={num(totals.totalReceivable).toFixed(0)}
            color="#c62828"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Card label="Bills" value={num(totals.billCount)} color="#1565c0" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>
          {groupBy === "month" ? "Monthly" : "Daily"} Trend
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="totalSales"
              name="Total Sales"
              stroke="#1565c0"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="totalReceived"
              name="Received"
              stroke="#2e7d32"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>
          Payment Type Breakdown
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={cellSx}>Payment Type</TableCell>
              <TableCell sx={cellSx}>Amount Received</TableCell>
              <TableCell sx={cellSx}># Transactions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} sx={cellSx}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : byPaymentType.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} sx={cellSx}>
                  Is range mein koi sale nahi mili
                </TableCell>
              </TableRow>
            ) : (
              byPaymentType.map((p) => (
                <TableRow key={p._id}>
                  <TableCell sx={cellSx}>{p._id}</TableCell>
                  <TableCell sx={cellSx}>Rs {p.totalAmount}</TableCell>
                  <TableCell sx={cellSx}>{p.count}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
