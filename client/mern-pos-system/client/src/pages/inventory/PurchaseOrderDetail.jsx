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
  Button,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { cellSx, fieldSx } from "../pos/PosLayout";
import poService from "../../services/purchaseOrderServices";

const STEPS = ["DRAFT", "SENT", "CONFIRMED", "RECEIVED"];

const STATUS_COLOR = {
  DRAFT: "default",
  SENT: "info",
  CONFIRMED: "primary",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "error",
};

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [po, setPo] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // ---- Receive Goods dialog ----
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveRows, setReceiveRows] = useState([]); // [{item, itemName, qty, purchasePrice, remaining}]
  const [paidAmount, setPaidAmount] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [receiving, setReceiving] = useState(false);

  // ---- Cancel dialog ----
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await poService.getById(id);
      setPo(res.data.po);
      setPurchases(res.data.purchases);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load PO");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runAction = async (fn) => {
    try {
      setActionLoading(true);
      await fn();
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const openReceiveDialog = () => {
    const rows = po.items
      .filter((line) => line.qtyReceived < line.qtyOrdered)
      .map((line) => ({
        item: line.item._id,
        itemName: line.item.itemName,
        remaining: line.qtyOrdered - line.qtyReceived,
        qty: line.qtyOrdered - line.qtyReceived, // default: sab baaki receive kar lo
        purchasePrice: line.expectedPrice,
      }));
    setReceiveRows(rows);
    setPaidAmount(0);
    setRemarks("");
    setReceiveOpen(true);
  };

  const updateReceiveRow = (idx, field, value) => {
    setReceiveRows((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const submitReceive = async () => {
    const items = receiveRows
      .filter((r) => Number(r.qty) > 0)
      .map((r) => ({
        item: r.item,
        qty: Number(r.qty),
        purchasePrice: Number(r.purchasePrice),
      }));
    if (items.length === 0) return alert("Kam az kam 1 item ki qty daalo");

    setReceiving(true);
    try {
      await poService.receiveGoods(id, {
        items,
        paidAmount: Number(paidAmount),
        remarks,
      });
      setReceiveOpen(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Goods receive nahi ho sake");
    } finally {
      setReceiving(false);
    }
  };

  if (loading) return <Typography sx={{ p: 3 }}>Loading...</Typography>;
  if (error)
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  if (!po) return null;

  const activeStep =
    po.status === "CANCELLED"
      ? -1
      : STEPS.indexOf(
          po.status === "PARTIALLY_RECEIVED" ? "CONFIRMED" : po.status,
        );

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
      <Button onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        ← Back to List
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
            {po.poNumber}
          </Typography>
          <Chip
            label={po.status.replace("_", " ")}
            color={STATUS_COLOR[po.status]}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" mb={2}>
          Supplier: {po.supplier?.name}{" "}
          {po.supplier?.phone ? `(${po.supplier.phone})` : ""}
        </Typography>

        {po.status !== "CANCELLED" && (
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {STEPS.map((s) => (
              <Step key={s}>
                <StepLabel>{s.replace("_", " ")}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {/* Action buttons based on current status */}
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          {po.status === "DRAFT" && (
            <Button
              variant="contained"
              disabled={actionLoading}
              onClick={() => runAction(() => poService.send(id))}
            >
              Send to Supplier
            </Button>
          )}
          {po.status === "SENT" && (
            <Button
              variant="contained"
              color="success"
              disabled={actionLoading}
              onClick={() => runAction(() => poService.confirm(id))}
            >
              Mark Confirmed (supplier ne confirm kar diya)
            </Button>
          )}
          {(po.status === "CONFIRMED" ||
            po.status === "PARTIALLY_RECEIVED") && (
            <Button
              variant="contained"
              color="primary"
              onClick={openReceiveDialog}
            >
              Receive Goods
            </Button>
          )}
          {!["RECEIVED", "CANCELLED"].includes(po.status) && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => setCancelOpen(true)}
            >
              Cancel PO
            </Button>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#e0e0e0" }}>
              <TableCell sx={cellSx}>Item</TableCell>
              <TableCell sx={cellSx}>Ordered</TableCell>
              <TableCell sx={cellSx}>Received</TableCell>
              <TableCell sx={cellSx}>Remaining</TableCell>
              <TableCell sx={cellSx}>Expected Price</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {po.items.map((line, idx) => (
              <TableRow key={idx}>
                <TableCell sx={cellSx}>{line.item?.itemName}</TableCell>
                <TableCell sx={cellSx} align="center">
                  {line.qtyOrdered}
                </TableCell>
                <TableCell sx={cellSx} align="center">
                  {line.qtyReceived}
                </TableCell>
                <TableCell sx={cellSx} align="center">
                  {line.qtyOrdered - line.qtyReceived}
                </TableCell>
                <TableCell sx={cellSx} align="right">
                  {line.expectedPrice}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {po.notes && (
          <Typography
            sx={{
              fontSize: 12,
              color: "text.secondary",
              mt: 2,
              whiteSpace: "pre-line",
            }}
          >
            Notes: {po.notes}
          </Typography>
        )}
      </Paper>

      {purchases.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Receiving History ({purchases.length})
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#e0e0e0" }}>
                <TableCell sx={cellSx}>Invoice</TableCell>
                <TableCell sx={cellSx}>Date</TableCell>
                <TableCell sx={cellSx}>Total</TableCell>
                <TableCell sx={cellSx}>Paid</TableCell>
                <TableCell sx={cellSx}>Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.map((p) => (
                <TableRow key={p._id}>
                  <TableCell sx={cellSx}>{p.invoiceNo}</TableCell>
                  <TableCell sx={cellSx}>
                    {new Date(p.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={cellSx}>Rs {p.totalAmount}</TableCell>
                  <TableCell sx={cellSx}>Rs {p.paidAmount}</TableCell>
                  <TableCell sx={cellSx}>Rs {p.balance}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Receive Goods Dialog */}
      <Dialog
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Receive Goods — {po.poNumber}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={cellSx}>Item</TableCell>
                <TableCell sx={cellSx}>
                  Qty (max {"\u2264"} remaining)
                </TableCell>
                <TableCell sx={cellSx}>Purchase Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {receiveRows.map((row, idx) => (
                <TableRow key={row.item}>
                  <TableCell sx={cellSx}>
                    {row.itemName}
                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                      Remaining: {row.remaining}
                    </Typography>
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <TextField
                      size="small"
                      type="number"
                      sx={{ ...fieldSx, width: 80 }}
                      value={row.qty}
                      inputProps={{ max: row.remaining, min: 0 }}
                      onChange={(e) => {
                        const v = Math.min(
                          Number(e.target.value) || 0,
                          row.remaining,
                        );
                        updateReceiveRow(idx, "qty", v);
                      }}
                    />
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <TextField
                      size="small"
                      type="number"
                      sx={{ ...fieldSx, width: 90 }}
                      value={row.purchasePrice}
                      onChange={(e) =>
                        updateReceiveRow(idx, "purchasePrice", e.target.value)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <TextField
            label="Paid Amount"
            type="number"
            size="small"
            fullWidth
            sx={{ ...fieldSx, mt: 2 }}
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
          />
          <TextField
            label="Remarks (optional)"
            size="small"
            fullWidth
            sx={{ ...fieldSx, mt: 2 }}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiveOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submitReceive}
            disabled={receiving}
          >
            {receiving ? "Receiving..." : "Confirm Receive"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel PO Dialog */}
      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Cancel PO — {po.poNumber}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="Reason"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>Close</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() =>
              runAction(async () => {
                await poService.cancel(id, cancelReason);
                setCancelOpen(false);
              })
            }
          >
            Confirm Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
