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
  Chip,
  Alert,
} from "@mui/material";
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

const STATUS_COLOR = {
  OK: "success",
  LOW: "warning",
  NEGATIVE: "error",
};

export default function StockReport() {
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({
    totalItems: 0,
    totalStockValue: 0,
    lowStockCount: 0,
    negativeStockCount: 0,
  });
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await reportService.getStockReport({ status });
      setItems(res.data.data);
      setTotals(res.data.totals);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load stock report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Stock / Inventory Report
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card label="Total Items" value={totals.totalItems} color="#1565c0" />
        </Grid>
        <Grid item xs={6} md={3}>
          <Card
            label="Total Stock Value"
            value={`Rs ${totals.totalStockValue.toFixed(0)}`}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Card
            label="Low Stock Items"
            value={totals.lowStockCount}
            color="#c77a1f"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Card
            label="Negative Stock Items"
            value={totals.negativeStockCount}
            color="#c62828"
          />
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          label="Status Filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ ...fieldSx, width: 180 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="ok">OK</MenuItem>
          <MenuItem value="low">Low Stock</MenuItem>
          <MenuItem value="negative">Negative Stock</MenuItem>
        </TextField>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={cellSx}>Item</TableCell>
              <TableCell sx={cellSx}>Barcode</TableCell>
              <TableCell sx={cellSx}>Category</TableCell>
              <TableCell sx={cellSx}>Stock Qty</TableCell>
              <TableCell sx={cellSx}>Min Alert</TableCell>
              <TableCell sx={cellSx}>Stock Value</TableCell>
              <TableCell sx={cellSx}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} sx={cellSx}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={cellSx}>
                  Koi item nahi mila
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item._id}>
                  <TableCell sx={cellSx}>{item.itemName}</TableCell>
                  <TableCell sx={cellSx}>{item.barcode}</TableCell>
                  <TableCell sx={cellSx}>{item.category}</TableCell>
                  <TableCell sx={cellSx}>
                    <span
                      style={{
                        color: item.stockQty < 0 ? "#c62828" : "inherit",
                        fontWeight: item.stockQty < 0 ? 700 : 400,
                      }}
                    >
                      {item.stockQty}
                    </span>
                  </TableCell>
                  <TableCell sx={cellSx}>{item.minStockAlert}</TableCell>
                  <TableCell sx={cellSx}>
                    Rs {item.stockValue.toFixed(0)}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <Chip
                      label={item.status}
                      size="small"
                      color={STATUS_COLOR[item.status]}
                    />
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
