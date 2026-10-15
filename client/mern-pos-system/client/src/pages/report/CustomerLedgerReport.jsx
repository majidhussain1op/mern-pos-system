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
  Stack,
  Chip,
  Button,
  Alert,
  Grid,
} from "@mui/material";
import { Link } from "react-router-dom";
import { cellSx, fieldSx } from "../pos/PosLayout";
import crmService from "../../services/CrmServices";

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

export default function CustomerLedgerReport() {
  const [customers, setCustomers] = useState([]);
  const [totalReceivable, setTotalReceivable] = useState(0);
  const [minBalance, setMinBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await crmService.getDueList({ minBalance });
      setCustomers(res.data.customers);
      setTotalReceivable(res.data.totalReceivable);
      setError("");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load customer ledger",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minBalance]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Customer Ledger Report
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={4}>
          <Card
            label="Total Receivable"
            value={`Rs ${totalReceivable.toFixed(0)}`}
            color="#c62828"
          />
        </Grid>
        <Grid item xs={6} md={4}>
          <Card
            label="Customers with Dues"
            value={customers.length}
            color="#1565c0"
          />
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Min Balance"
          type="number"
          value={minBalance}
          onChange={(e) => setMinBalance(Number(e.target.value) || 0)}
          sx={{ ...fieldSx, width: 160 }}
          helperText="Sirf itne se zyada balance wale dikhao"
        />
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={cellSx}>Customer</TableCell>
              <TableCell sx={cellSx}>Phone</TableCell>
              <TableCell sx={cellSx}>Balance (Receivable)</TableCell>
              <TableCell sx={cellSx}>Credit Limit</TableCell>
              <TableCell sx={cellSx}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} sx={cellSx}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={cellSx}>
                  Koi customer due nahi hai
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => {
                const overLimit =
                  c.creditLimit > 0 && c.balance > c.creditLimit;
                return (
                  <TableRow key={c._id}>
                    <TableCell sx={cellSx}>{c.name}</TableCell>
                    <TableCell sx={cellSx}>{c.phone || "—"}</TableCell>
                    <TableCell sx={cellSx}>
                      <Chip
                        label={`Rs ${c.balance}`}
                        size="small"
                        color={overLimit ? "error" : "warning"}
                      />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      {c.creditLimit > 0 ? `Rs ${c.creditLimit}` : "No limit"}
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Button
                        size="small"
                        component={Link}
                        to={`/pos/reports/customer-ledger/${c._id}`}
                      >
                        Statement
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
