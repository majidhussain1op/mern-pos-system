import { useEffect, useState } from "react";
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
  Alert,
  Chip,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cellSx, fieldSx } from "../pos/PosLayout";
import reportService from "../../services/ReportServices";

const LIMIT_OPTIONS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]; // fix: pehle 50-100 sab ka value={50} tha (copy-paste bug)

export default function TopSellingItems() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(10);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = { limit };
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await reportService.getTopSellingItems(params);
      setData(res.data.data);
      setError("");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load top selling items",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, limit]);

  const chartData = data.map((d) => ({
    ...d,
    shortName:
      d.itemName.length > 15 ? d.itemName.slice(0, 15) + "…" : d.itemName,
  }));

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Best Selling Items
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
          label="Top"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          sx={{ ...fieldSx, width: 120 }}
        >
          {LIMIT_OPTIONS.map((n) => (
            <MenuItem key={n} value={n}>
              Top {n}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="shortName"
              angle={-30}
              textAnchor="end"
              height={70}
            />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                value,
                name === "totalQty" ? "Quantity Sold" : name,
              ]}
              labelFormatter={(label, payload) =>
                payload?.[0]?.payload?.itemName || label
              }
            />
            <Bar dataKey="totalQty" fill="#1976d2" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={cellSx}>#</TableCell>
              <TableCell sx={cellSx}>Item</TableCell>
              <TableCell sx={cellSx}>Barcode</TableCell>
              <TableCell sx={cellSx}>Qty Sold</TableCell>
              <TableCell sx={cellSx}>Revenue</TableCell>
              <TableCell sx={cellSx}># Sales</TableCell>
              <TableCell sx={cellSx}>Current Stock</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} sx={cellSx}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={cellSx}>
                  Is date range mein koi sale nahi mili
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, idx) => (
                <TableRow key={item.itemId || idx}>
                  <TableCell sx={cellSx}>{idx + 1}</TableCell>
                  <TableCell sx={cellSx}>{item.itemName}</TableCell>
                  <TableCell sx={cellSx}>{item.barcode || "—"}</TableCell>
                  <TableCell sx={cellSx}>
                    <Chip label={item.totalQty} size="small" color="primary" />
                  </TableCell>
                  <TableCell sx={cellSx}>Rs {item.totalRevenue}</TableCell>
                  <TableCell sx={cellSx}>{item.salesCount}</TableCell>
                  <TableCell sx={cellSx}>
                    {item.currentStock !== undefined ? item.currentStock : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
