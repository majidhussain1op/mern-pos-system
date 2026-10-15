import { useState, useEffect } from "react";
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
  TextField,
  Stack,
  Chip,
  Button,
  Alert,
  Grid,
} from "@mui/material";
import { cellSx, fieldSx } from "../pos/PosLayout";
import accountingService from "../../services/AccountingServices";

export default function AccountLedger() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await accountingService.getAccountLedger(id, params);
      setAccount(res.data.account);
      setTransactions(res.data.transactions);
      setCurrentBalance(res.data.currentBalance);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load account ledger");
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
        ← Back to Trial Balance
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {account && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={7}>
              <Typography variant="h5" fontWeight={600}>
                {account.code} - {account.name}
              </Typography>
              <Chip label={account.type} size="small" sx={{ mt: 0.5 }} />
            </Grid>
            <Grid item xs={12} sm={5} sx={{ textAlign: { sm: "right" } }}>
              <Typography variant="body2" color="text.secondary">
                Current Balance
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                Rs {currentBalance.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Normal balance: {account.normalBalance}
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
              <TableCell sx={cellSx}>Entry #</TableCell>
              <TableCell sx={cellSx}>Date</TableCell>
              <TableCell sx={cellSx}>Description</TableCell>
              <TableCell sx={cellSx}>Debit</TableCell>
              <TableCell sx={cellSx}>Credit</TableCell>
              <TableCell sx={cellSx}>Running Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} sx={cellSx}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={cellSx}>
                  Koi transaction nahi mili
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t, i) => (
                <TableRow key={i}>
                  <TableCell sx={cellSx}>{t.entryNo}</TableCell>
                  <TableCell sx={cellSx}>
                    {new Date(t.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {t.description}
                    <Chip label={t.refType} size="small" sx={{ ml: 1 }} />
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {t.debit > 0 ? `Rs ${t.debit.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {t.credit > 0 ? `Rs ${t.credit.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <strong>Rs {t.runningBalance.toFixed(2)}</strong>
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
