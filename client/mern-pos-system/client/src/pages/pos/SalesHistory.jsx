import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Print as PrintIcon, Block as VoidIcon } from "@mui/icons-material";
import PosLayout, { cellSx, fieldSx } from "./PosLayout";
import api from "../../services/api";

const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "partial", label: "Partial" },
  { value: "pending", label: "Pending" },
];

// 👈 naya - backend ab status filter bhi support karta hai (ACTIVE/VOID)
const SALE_STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "VOID", label: "Void" },
];

const SHOP_INFO = {
  name: "Your Shop Name",
  address: "Shop Address, City",
  phone: "0300-0000000",
};

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [customer, setCustomer] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [saleStatus, setSaleStatus] = useState(""); // 👈 naya
  const [detail, setDetail] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    salesman: "",
    biltiNo: "",
    remarks: "",
    paymentType: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // 👈 naya - backend ab pagination return karta hai (poori list nahi)
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Reprint
  const [printTarget, setPrintTarget] = useState(null);
  const [printChoiceOpen, setPrintChoiceOpen] = useState(false);

  // Void (password + reason ab dono required hain)
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidPassword, setVoidPassword] = useState("");
  const [voidReason, setVoidReason] = useState(""); // 👈 naya
  const [voidError, setVoidError] = useState(""); // 👈 naya - inline error dikhane ke liye
  const [voiding, setVoiding] = useState(false);

  const buildQuery = () => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (invoiceNo) params.invoiceNo = invoiceNo;
    if (customer) params.customer = customer;
    if (paymentStatus) params.paymentStatus = paymentStatus;
    if (saleStatus) params.status = saleStatus; // 👈 naya
    params.page = page; // 👈 naya
    params.limit = 30; // 👈 naya
    return params;
  };

  const load = async () => {
    const { data } = await api.get("/sales", { params: buildQuery() });
    setSales(data.sales);
    setPagination(data.pagination); // 👈 naya
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); // 👈 naya - page badalte hi reload

  const openDetail = async (id) => {
    const { data } = await api.get(`/sales/${id}`);
    setDetail(data.sale);
  };

  // ---- Reprint (koi change nahi) ----
  const buildReceiptRows = (items) =>
    items
      .map(
        (line) => `
        <tr>
          <td>${line.item?.itemName || ""}</td>
          <td style="text-align:center">${line.qty}</td>
          <td style="text-align:right">${line.sellPrice}</td>
          <td style="text-align:right">${(line.lineTotal ?? 0).toFixed(2)}</td>
        </tr>`,
      )
      .join("");

  const openPrintWindow = (html) => {
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head>${html.replace(/<html>|<\/html>|<head>[\s\S]*?<\/head>/g, "")}`;
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const w = window.open(url, "_blank");
    if (!w) {
      alert(
        "Print window block ho gayi. Browser ke address bar mein popup-blocked icon check karein aur is site ke liye popups allow karein.",
      );
      URL.revokeObjectURL(url);
      return;
    }

    w.addEventListener("load", () => {
      w.focus();
      w.print();
    });

    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const openReprint = async (id) => {
    const { data } = await api.get(`/sales/${id}`);
    setPrintTarget(data.sale);
    setPrintChoiceOpen(true);
  };

  const printThermal = () => {
    if (!printTarget) return;
    const html = `
    <html>
    <head>
      <title>Receipt</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 78mm; margin: 0 auto; padding: 4px; }
        h2 { text-align:center; margin: 4px 0; font-size: 14px; }
        p { margin: 2px 0; text-align:center; }
        table { width:100%; border-collapse: collapse; margin-top:6px; }
        td, th { font-size: 11px; padding: 2px 0; }
        hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
        .totals td { font-weight: bold; }
        .center { text-align:center; }
        .right { text-align:right; }
        .reprint-badge { text-align:center; font-weight:bold; border:1px dashed #000; margin:4px 0; padding:2px; }
      </style>
    </head>
    <body>
      <h2>${SHOP_INFO.name}</h2>
      <p>${SHOP_INFO.address}</p>
      <p>${SHOP_INFO.phone}</p>
      <div class="reprint-badge">*** REPRINT ***</div>
      <hr/>
      <p class="center">Invoice: ${printTarget.invoiceNo}</p>
      <p class="center">${new Date(printTarget.date).toLocaleString()}</p>
      <p class="center">Customer: ${printTarget.customer?.name || "COUNTER"}</p>
      <hr/>
      <table>
        <tr><td>Item</td><td class="center">Qty</td><td class="right">Price</td><td class="right">Total</td></tr>
        ${buildReceiptRows(printTarget.items)}
      </table>
      <hr/>
      <table class="totals">
        <tr><td>Total</td><td class="right">${printTarget.totalAmount?.toFixed(2)}</td></tr>
        <tr><td>Received</td><td class="right">${printTarget.receivedAmount?.toFixed(2)}</td></tr>
        <tr><td>Receivable</td><td class="right">${printTarget.receivable?.toFixed(2)}</td></tr>
      </table>
      <hr/>
      <p>Thank you!</p>
    </body>
    </html>`;
    openPrintWindow(html);
    setPrintChoiceOpen(false);
  };

  const printLaser = () => {
    if (!printTarget) return;
    const html = `
    <html>
    <head>
      <title>Invoice</title>
      <style>
        @page { size: A5; margin: 15mm; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #222; }
        .header { display:flex; justify-content:space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
        .header h1 { margin:0; font-size: 20px; }
        table { width:100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; }
        th { background: #f0f0f0; text-align:left; }
        .right { text-align:right; }
        .totals { margin-top: 15px; width: 250px; margin-left: auto; }
        .totals td { border: none; padding: 3px 0; }
        .totals .grand { font-weight:bold; font-size:14px; border-top: 1px solid #333; }
        .reprint-badge { text-align:center; font-weight:bold; color:#c62828; margin-bottom:8px; }
      </style>
    </head>
    <body>
      <div class="reprint-badge">*** REPRINT ***</div>
      <div class="header">
        <div>
          <h1>${SHOP_INFO.name}</h1>
          <p>${SHOP_INFO.address}<br/>${SHOP_INFO.phone}</p>
        </div>
        <div style="text-align:right">
          <p><strong>Invoice:</strong> ${printTarget.invoiceNo}</p>
          <p><strong>Date:</strong> ${new Date(printTarget.date).toLocaleString()}</p>
          <p><strong>Customer:</strong> ${printTarget.customer?.name || "COUNTER"}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
        </thead>
        <tbody>${buildReceiptRows(printTarget.items)}</tbody>
      </table>
      <table class="totals">
        <tr><td>Sub Total</td><td class="right">${printTarget.totalAmount?.toFixed(2)}</td></tr>
        <tr><td>Received</td><td class="right">${printTarget.receivedAmount?.toFixed(2)}</td></tr>
        <tr class="grand"><td>Receivable</td><td class="right">${printTarget.receivable?.toFixed(2)}</td></tr>
      </table>
    </body>
    </html>`;
    openPrintWindow(html);
    setPrintChoiceOpen(false);
  };

  // ---- Void (password + reason) ----
  const openVoidDialog = (sale) => {
    setVoidTarget(sale);
    setVoidPassword("");
    setVoidReason(""); // 👈 naya
    setVoidError(""); // 👈 naya
  };

  const confirmVoid = async () => {
    // 👈 naya - backend ab reason bhi require karta hai, warna 400 aayega
    if (!voidPassword.trim()) {
      setVoidError("Password enter karein");
      return;
    }
    if (!voidReason.trim()) {
      setVoidError("Void reason likhna zaroori hai");
      return;
    }
    setVoiding(true);
    setVoidError("");
    try {
      await api.post(`/sales/${voidTarget._id}/void`, {
        password: voidPassword,
        reason: voidReason, // 👈 naya
      });
      setVoidTarget(null);
      setVoidPassword("");
      setVoidReason("");
      load();
    } catch (err) {
      setVoidError(
        err.response?.data?.message ||
          "Void failed - password galat ho sakta hai",
      );
    } finally {
      setVoiding(false);
    }
  };

  const openEditDialog = (sale) => {
    setEditTarget(sale);
    setEditForm({
      salesman: sale.salesman?.name || "",
      biltiNo: sale.biltiNo || "",
      remarks: sale.remarks || "",
      paymentType: sale.paymentType || "CASH",
    });
    setEditError("");
  };

  const confirmEdit = async () => {
    setEditSaving(true);
    setEditError("");
    try {
      await api.patch(`/sales/${editTarget._id}`, {
        biltiNo: editForm.biltiNo,
        remarks: editForm.remarks,
        paymentType: editForm.paymentType,
        // salesman ObjectId hai - agar tumhare paas salesman-picker component
        // hai to uski id yahan bhejo, filhal is field ko read-only rakh raha hoon
      });
      setEditTarget(null);
      load();
    } catch (err) {
      setEditError(err.response?.data?.message || "Edit fail ho gaya");
    } finally {
      setEditSaving(false);
    }
  };

  const openDeleteDialog = (sale) => {
    setDeleteTarget(sale);
    setDeletePassword("");
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!deletePassword.trim()) {
      setDeleteError("Password enter karein");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete(`/sales/${deleteTarget._id}`, {
        data: { password: deletePassword }, // axios DELETE body "data" key mein jata hai
      });
      setDeleteTarget(null);
      load();
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Delete fail ho gaya");
    } finally {
      setDeleting(false);
    }
  };

  const activeFilterCount = [
    invoiceNo,
    customer,
    paymentStatus,
    saleStatus, // 👈 naya
  ].filter(Boolean).length;

  const clearFilters = () => {
    setInvoiceNo("");
    setCustomer("");
    setPaymentStatus("");
    setSaleStatus(""); // 👈 naya
    setFrom("");
    setTo("");
    setPage(1); // 👈 naya
  };

  const handleFilterClick = () => {
    setPage(1); // 👈 naya - filter change pe page 1 pe reset, phir load
    setTimeout(load, 0);
  };

  return (
    <PosLayout>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 2,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
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

          <Box>
            <Typography sx={{ fontSize: 12 }}>Invoice No</Typography>
            <TextField
              size="small"
              sx={fieldSx}
              placeholder="e.g. INV-1024"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </Box>

          <Box>
            <Typography sx={{ fontSize: 12 }}>Customer</Typography>
            <TextField
              size="small"
              sx={fieldSx}
              placeholder="Customer name"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
          </Box>

          <Box>
            <Typography sx={{ fontSize: 12 }}>Payment Status</Typography>
            <TextField
              select
              size="small"
              sx={{ ...fieldSx, minWidth: 130 }}
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* 👈 naya - sale status filter (Active/Void) */}
          <Box>
            <Typography sx={{ fontSize: 12 }}>Sale Status</Typography>
            <TextField
              select
              size="small"
              sx={{ ...fieldSx, minWidth: 110 }}
              value={saleStatus}
              onChange={(e) => setSaleStatus(e.target.value)}
            >
              {SALE_STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Button variant="contained" onClick={handleFilterClick}>
            Filter
          </Button>

          {activeFilterCount > 0 && (
            <Chip
              label={`${activeFilterCount} Filters Active`}
              size="small"
              color="primary"
              variant="outlined"
              onDelete={() => {
                clearFilters();
                setTimeout(load, 0);
              }}
            />
          )}
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#e0e0e0" }}>
              <TableCell sx={cellSx}>Invoice</TableCell>
              <TableCell sx={cellSx}>Date</TableCell>
              <TableCell sx={cellSx}>Customer</TableCell>
              <TableCell sx={cellSx}>Salesman</TableCell>
              {/* 👈 naya */}
              <TableCell sx={cellSx}>Total</TableCell>
              <TableCell sx={cellSx}>Receivable</TableCell>
              <TableCell sx={cellSx}>Status</TableCell>
              <TableCell sx={cellSx}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((s) => (
              <TableRow key={s._id}>
                <TableCell sx={cellSx}>{s.invoiceNo}</TableCell>
                <TableCell sx={cellSx}>
                  {new Date(s.date).toLocaleDateString()}
                </TableCell>
                <TableCell sx={cellSx}>{s.customer?.name}</TableCell>
                <TableCell sx={cellSx}>{s.salesman?.name || "-"}</TableCell>
                {/* 👈 naya */}
                <TableCell sx={cellSx} align="right">
                  {(s.totalAmount ?? 0).toFixed(2)}
                </TableCell>
                <TableCell
                  sx={{
                    ...cellSx,
                    color: s.receivable > 0 ? "#c62828" : "inherit",
                  }}
                  align="right"
                >
                  {(s.receivable ?? 0).toFixed(2)}
                </TableCell>
                <TableCell sx={cellSx}>
                  {s.status === "VOID" ? (
                    <Chip label="VOID" size="small" color="error" />
                  ) : (
                    <Chip
                      label="Active"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  )}
                </TableCell>
                <TableCell sx={cellSx}>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    <Button size="small" onClick={() => openDetail(s._id)}>
                      View
                    </Button>
                    <Button
                      size="small"
                      startIcon={<PrintIcon fontSize="small" />}
                      onClick={() => openReprint(s._id)}
                    >
                      Print
                    </Button>
                    {s.status !== "VOID" && (
                      <>
                        <Button size="small" onClick={() => openEditDialog(s)}>
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<VoidIcon fontSize="small" />}
                          onClick={() => openVoidDialog(s)}
                        >
                          Void
                        </Button>
                      </>
                    )}
                    <Button
                      size="small"
                      color="error"
                      onClick={() => openDeleteDialog(s)}
                    >
                      Delete
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {sales.length === 0 && (
              <TableRow>
                <TableCell sx={cellSx} colSpan={8} align="center">
                  No sales found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* 👈 naya - pagination controls */}
        {pagination && pagination.totalPages > 1 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
              mt: 2,
            }}
          >
            <Button
              size="small"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <Typography sx={{ fontSize: 13 }}>
              Page {pagination.page} of {pagination.totalPages} (
              {pagination.total} sales)
            </Typography>
            <Button
              size="small"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </Box>
        )}
      </Paper>

      <Dialog
        open={!!detail}
        onClose={() => setDetail(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Invoice {detail?.invoiceNo}</DialogTitle>
        <DialogContent>
          {detail && (
            <>
              <Typography sx={{ fontSize: 13, mb: 1 }}>
                Customer: {detail.customer?.name} | Salesman:{" "}
                {detail.salesman?.name || "-"} {/* 👈 naya */}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#e0e0e0" }}>
                    <TableCell sx={cellSx}>Item</TableCell>
                    <TableCell sx={cellSx}>Qty</TableCell>
                    <TableCell sx={cellSx}>Price</TableCell>
                    <TableCell sx={cellSx}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.items.map((line, i) => (
                    <TableRow key={i}>
                      <TableCell sx={cellSx}>{line.item?.itemName}</TableCell>
                      <TableCell sx={cellSx} align="center">
                        {line.qty}
                      </TableCell>
                      <TableCell sx={cellSx} align="right">
                        {line.sellPrice}
                      </TableCell>
                      <TableCell sx={cellSx} align="right">
                        {(line.lineTotal ?? 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography sx={{ fontSize: 15, fontWeight: 700, mt: 2 }}>
                Total: {(detail.totalAmount ?? 0).toFixed(2)} | Received:{" "}
                {(detail.receivedAmount ?? 0).toFixed(2)} | Receivable:{" "}
                {(detail.receivable ?? 0).toFixed(2)}
              </Typography>

              {/* 👈 naya - void info dikhana agar voided hai */}
              {detail.status === "VOID" && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    bgcolor: "#fdecea",
                    border: "1px solid #f5c6cb",
                    borderRadius: 1,
                  }}
                >
                  <Typography sx={{ fontSize: 13, color: "#c62828" }}>
                    Voided by {detail.voidedBy?.name || "-"} on{" "}
                    {detail.voidedAt
                      ? new Date(detail.voidedAt).toLocaleString()
                      : "-"}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: "#c62828" }}>
                    Reason: {detail.voidReason || "-"}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reprint Choice Dialog (koi change nahi) */}
      <Dialog
        open={printChoiceOpen}
        onClose={() => setPrintChoiceOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontSize: 16 }}>
          Reprint Invoice {printTarget?.invoiceNo}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, mb: 2 }}>
            Printer type select karein:
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              fullWidth
              onClick={printThermal}
            >
              Thermal
            </Button>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              fullWidth
              color="secondary"
              onClick={printLaser}
            >
              Laser (A5)
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintChoiceOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Void Dialog - ab reason field bhi hai */}
      <Dialog
        open={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontSize: 16 }}>
          Void Invoice {voidTarget?.invoiceNo}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, mb: 2, color: "#c62828" }}>
            Ye action permanent hai — stock wapas item mein add ho jayega aur
            sale cancelled ho jayegi. Continue karne ke liye admin password aur
            reason enter karein.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Admin Password"
            size="small"
            sx={{ mb: 2 }}
            value={voidPassword}
            onChange={(e) => setVoidPassword(e.target.value)}
          />
          {/* 👈 naya - reason field */}
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Void Reason"
            size="small"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
          {voidError && (
            <Typography sx={{ fontSize: 12, color: "#c62828", mt: 1 }}>
              {voidError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmVoid}
            disabled={voiding}
          >
            {voiding ? "Voiding..." : "Confirm Void"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Edit Dialog */}
      <Dialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontSize: 16 }}>
          Edit Invoice {editTarget?.invoiceNo}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12, mb: 2, color: "#666" }}>
            Sirf details edit hoti hain — items/qty/price/discount change nahi
            ho sakte (stock accuracy ke liye). Wo change karna ho to Void karke
            naya invoice banayein.
          </Typography>
          <TextField
            fullWidth
            label="Salesman (read-only)"
            size="small"
            sx={{ mb: 2 }}
            value={editForm.salesman}
            disabled
          />
          <TextField
            fullWidth
            label="Bilti No"
            size="small"
            sx={{ mb: 2 }}
            value={editForm.biltiNo}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, biltiNo: e.target.value }))
            }
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Remarks"
            size="small"
            sx={{ mb: 2 }}
            value={editForm.remarks}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, remarks: e.target.value }))
            }
          />
          <TextField
            select
            fullWidth
            label="Payment Type"
            size="small"
            value={editForm.paymentType}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, paymentType: e.target.value }))
            }
          >
            {["CASH", "CARD", "EASYPAISA", "JAZZCASH", "BANK"].map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          {editError && (
            <Typography sx={{ fontSize: 12, color: "#c62828", mt: 1 }}>
              {editError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={confirmEdit}
            disabled={editSaving}
          >
            {editSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontSize: 16 }}>
          Delete Invoice {deleteTarget?.invoiceNo}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, mb: 2, color: "#c62828" }}>
            Ye sale list se hamesha ke liye hide ho jayegi (stock wapas nahi
            hoga — agar stock bhi wapas karna hai to pehle Void karein, phir
            Delete). Admin password enter karein.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Admin Password"
            size="small"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmDelete()}
          />
          {deleteError && (
            <Typography sx={{ fontSize: 12, color: "#c62828", mt: 1 }}>
              {deleteError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </PosLayout>
  );
}
