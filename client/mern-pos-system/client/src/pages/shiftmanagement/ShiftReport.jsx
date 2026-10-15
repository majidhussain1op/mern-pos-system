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
  Divider,
  Alert,
  Button,
} from "@mui/material";
import { COLORS, cellSx } from "../pos/PosLayout";
import shiftService from "../../services/ShiftServices";

export default function ShiftReport() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await shiftService.getShiftReport(id);
        setData(res.data.data);
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load shift report");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  if (loading) return <Typography sx={{ p: 3 }}>Loading report...</Typography>;

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const { shift, cashMovements, sales } = data;

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
      <Button onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        ← Back to History
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h5" fontWeight={600}>
            Shift {shift.shiftNumber}
          </Typography>
          <Chip
            label={shift.status}
            color={shift.status === "OPEN" ? "success" : "default"}
          />
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">
              Cashier
            </Typography>
            <Typography fontWeight={600}>
              {shift.cashier?.name || "—"}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">
              Opened At
            </Typography>
            <Typography fontWeight={600}>
              {new Date(shift.openedAt).toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">
              Closed At
            </Typography>
            <Typography fontWeight={600}>
              {shift.closedAt ? new Date(shift.closedAt).toLocaleString() : "—"}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">
              Force Closed
            </Typography>
            <Typography fontWeight={600}>
              {shift.isForceClosed ? `Yes — ${shift.forceCloseReason}` : "No"}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <SummaryItem label="Opening Cash" value={shift.openingCash} />
          <SummaryItem label="Cash Sales" value={shift.totalCashSales} />
          <SummaryItem label="Card Sales" value={shift.totalCardSales} />
          <SummaryItem
            label="Other Sales"
            value={shift.totalOtherTenderSales}
          />
          <SummaryItem label="Cash In" value={shift.totalCashIn} />
          <SummaryItem label="Cash Out" value={shift.totalCashOut} />
          <SummaryItem label="Expected Cash" value={shift.expectedCash} bold />
          <SummaryItem label="Counted Cash" value={shift.closingCash} bold />
        </Grid>

        {shift.variance !== null && shift.variance !== undefined && (
          <Box sx={{ mt: 2, textAlign: "right" }}>
            <Typography variant="body2" color="text.secondary" component="span">
              Variance:{" "}
            </Typography>
            <Typography
              component="span"
              fontWeight={700}
              sx={{
                color: shift.variance === 0 ? COLORS?.success : COLORS?.error,
              }}
            >
              {shift.variance > 0 ? "+" : ""}
              {shift.variance}
            </Typography>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          Cash Movements ({cashMovements.length})
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={cellSx}>Type</TableCell>
              <TableCell sx={cellSx}>Amount</TableCell>
              <TableCell sx={cellSx}>Reason</TableCell>
              <TableCell sx={cellSx}>By</TableCell>
              <TableCell sx={cellSx}>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cashMovements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={cellSx}>
                  Koi cash movement nahi hui
                </TableCell>
              </TableRow>
            ) : (
              cashMovements.map((m) => (
                <TableRow key={m._id}>
                  <TableCell sx={cellSx}>
                    <Chip
                      label={m.type}
                      size="small"
                      color={m.type === "CASH_IN" ? "success" : "error"}
                    />
                  </TableCell>
                  <TableCell sx={cellSx}>Rs {m.amount}</TableCell>
                  <TableCell sx={cellSx}>{m.reason}</TableCell>
                  <TableCell sx={cellSx}>{m.createdBy?.name || "—"}</TableCell>
                  <TableCell sx={cellSx}>
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          Sales ({sales.length})
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={cellSx}>Invoice</TableCell>
              <TableCell sx={cellSx}>Payment</TableCell>
              <TableCell sx={cellSx}>Total</TableCell>
              <TableCell sx={cellSx}>Received</TableCell>
              <TableCell sx={cellSx}>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={cellSx}>
                  Is shift mein koi sale nahi hui
                </TableCell>
              </TableRow>
            ) : (
              sales.map((s) => (
                <TableRow key={s._id}>
                  <TableCell sx={cellSx}>{s.invoiceNo}</TableCell>
                  <TableCell sx={cellSx}>{s.paymentType}</TableCell>
                  <TableCell sx={cellSx}>Rs {s.totalAmount}</TableCell>
                  <TableCell sx={cellSx}>Rs {s.receivedAmount}</TableCell>
                  <TableCell sx={cellSx}>
                    {new Date(s.createdAt).toLocaleTimeString()}
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

const SummaryItem = ({ label, value, bold }) => (
  <Grid item xs={6} sm={3}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography fontWeight={bold ? 700 : 600}>Rs {value}</Typography>
  </Grid>
);
