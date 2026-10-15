import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Grid,
  Stack,
  TextField,
  Alert,
  Button,
} from "@mui/material";
import { cellSx, fieldSx } from "../pos/PosLayout";
import crmService from "../../services/CrmServices";

const TYPE_COLOR = {
  SALE: "error", // debit — customer pe charge chadha
  PAYMENT_IN: "success", // credit — customer ne diya
  PAYMENT_OUT: "warning",
  ADJUSTMENT: "default",
};

export default function CustomerStatement() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await crmService.getStatement(id, params);
      setCustomer(res.data.customer);
      setCurrentBalance(res.data.currentBalance);
      setEntries(res.data.entries);
      setError("");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load customer statement",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, from, to]);

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
      <Button onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        ← Back to Ledger
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {customer && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="h5" fontWeight={600}>
                {customer.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {customer.phone || "—"}{" "}
                {customer.address ? `• ${customer.address}` : ""}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ textAlign: { sm: "right" } }}>
              <Typography variant="body2" color="text.secondary">
                Current Balance
              </Typography>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{ color: currentBalance > 0 ? "#c62828" : "#2e7d32" }}
              >
                Rs {currentBalance}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
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
              <TableCell sx={cellSx}>Date</TableCell>
              <TableCell sx={cellSx}>Type</TableCell>
              <TableCell sx={cellSx}>Reference</TableCell>
              <TableCell sx={cellSx}>Debit</TableCell>
              <TableCell sx={cellSx}>Credit</TableCell>
              <TableCell sx={cellSx}>Balance After</TableCell>
              <TableCell sx={cellSx}>Note</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} sx={cellSx}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={cellSx}>
                  Koi transaction nahi mili
                </TableCell>
              </TableRow>
            ) : (
              entries.map((e) => (
                <TableRow key={e._id}>
                  <TableCell sx={cellSx}>
                    {new Date(e.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <Chip
                      label={e.type}
                      size="small"
                      color={TYPE_COLOR[e.type] || "default"}
                    />
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {e.saleId?.invoiceNo || e.reference || "—"}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {e.debit ? `Rs ${e.debit}` : "—"}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {e.credit ? `Rs ${e.credit}` : "—"}
                  </TableCell>
                  <TableCell sx={cellSx}>Rs {e.balanceAfter}</TableCell>
                  <TableCell sx={cellSx}>{e.note || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
