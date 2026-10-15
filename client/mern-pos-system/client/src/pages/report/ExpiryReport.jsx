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
  EXPIRING_SOON: "warning",
  EXPIRED: "error",
};

export default function ExpiryReport() {
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({
    totalTracked: 0,
    expiredCount: 0,
    expiringSoonCount: 0,
    expiredStockValue: 0,
  });
  const [status, setStatus] = useState("all");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await reportService.getExpiryReport({ status, days });
      setItems(res.data.data);
      setTotals(res.data.totals);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load expiry report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, days]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Expiry Control
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card
            label="Tracked Items"
            value={totals.totalTracked}
            color="#1565c0"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Card label="Expired" value={totals.expiredCount} color="#c62828" />
        </Grid>
        <Grid item xs={6} md={3}>
          <Card
            label="Expiring Soon"
            value={totals.expiringSoonCount}
            color="#c77a1f"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Card
            label="Expired Stock Qty"
            value={totals.expiredStockValue}
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
          <MenuItem value="expiring_soon">Expiring Soon</MenuItem>
          <MenuItem value="expired">Expired</MenuItem>
        </TextField>
        <TextField
          select
          label="Warning Window"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          sx={{ ...fieldSx, width: 180 }}
        >
          <MenuItem value={7}>Next 7 days</MenuItem>
          <MenuItem value={15}>Next 15 days</MenuItem>
          <MenuItem value={30}>Next 30 days</MenuItem>
          <MenuItem value={60}>Next 60 days</MenuItem>
          <MenuItem value={90}>Next 90 days</MenuItem>
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
              <TableCell sx={cellSx}>Expiry Date</TableCell>
              <TableCell sx={cellSx}>Days Left</TableCell>
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
                  Koi tracked item nahi mila
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item._id}>
                  <TableCell sx={cellSx}>{item.itemName}</TableCell>
                  <TableCell sx={cellSx}>{item.barcode}</TableCell>
                  <TableCell sx={cellSx}>{item.category}</TableCell>
                  <TableCell sx={cellSx}>{item.stockQty}</TableCell>
                  <TableCell sx={cellSx}>
                    {new Date(item.expiryDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <span
                      style={{
                        color: item.daysUntilExpiry < 0 ? "#c62828" : "inherit",
                        fontWeight: item.daysUntilExpiry < 0 ? 700 : 400,
                      }}
                    >
                      {item.daysUntilExpiry < 0
                        ? `${Math.abs(item.daysUntilExpiry)} din pehle`
                        : `${item.daysUntilExpiry} din`}
                    </span>
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <Chip
                      label={item.status.replace("_", " ")}
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
