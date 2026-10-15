import { useState, useEffect, useRef } from "react";
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
  Chip,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { Add, Search, Delete } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { cellSx, fieldSx } from "../pos/PosLayout";
import poService from "../../services/purchaseOrderServices";
import api from "../../services/api";

const STATUS_COLOR = {
  DRAFT: "default",
  SENT: "info",
  CONFIRMED: "primary",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "error",
};

export default function PurchaseOrderList() {
  const [pos, setPos] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [supplierId, setSupplierId] = useState(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [supplierSearchText, setSupplierSearchText] = useState("");
  const [supplierResults, setSupplierResults] = useState([]);

  const [nameQuery, setNameQuery] = useState("");
  const [itemResults, setItemResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [qty, setQty] = useState(1);
  const [expectedPrice, setExpectedPrice] = useState("");
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const nameRef = useRef(null);

  const load = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (status) params.status = status;
      const res = await poService.getAll(params);
      setPos(res.data.data);
      setPagination(res.data.pagination);
      setError("");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load purchase orders",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!supplierSearchOpen) return;
    const delay = setTimeout(async () => {
      try {
        const { data } = await api.get("/manufacturers/search", {
          params: { q: supplierSearchText },
        });
        setSupplierResults(data.suppliers || []);
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [supplierSearchText, supplierSearchOpen]);

  useEffect(() => {
    if (!nameQuery.trim()) return setItemResults([]);
    const delay = setTimeout(async () => {
      try {
        const { data } = await api.get(`/items/search-name?q=${nameQuery}`);
        setItemResults(data.items);
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [nameQuery]);

  const selectSupplier = (s) => {
    setSupplierId(s._id);
    setSupplierName(s.name);
    setSupplierSearchOpen(false);
    setSupplierSearchText("");
  };

  const pickItem = (item) => {
    setSelectedItem(item);
    setExpectedPrice(item.purchasePrice || "");
    setItemResults([]);
    setNameQuery(item.itemName);
  };

  const addToCart = () => {
    if (!selectedItem) return alert("Pehle item select karo");
    if (!qty || qty <= 0) return alert("Qty valid honi chahiye");
    setCart((prev) => [
      ...prev,
      {
        item: selectedItem._id,
        itemName: selectedItem.itemName,
        barcode: selectedItem.barcode,
        qtyOrdered: Number(qty),
        expectedPrice: Number(expectedPrice) || 0,
      },
    ]);
    setSelectedItem(null);
    setNameQuery("");
    setQty(1);
    setExpectedPrice("");
    nameRef.current?.focus();
  };

  const removeRow = (idx) =>
    setCart((prev) => prev.filter((_, i) => i !== idx));

  const resetCreateForm = () => {
    setSupplierId(null);
    setSupplierName("");
    setCart([]);
    setNotes("");
  };

  const submitPO = async () => {
    if (!supplierId) return alert("Supplier select karo");
    if (cart.length === 0) return alert("Kam az kam 1 item add karo");
    setSaving(true);
    try {
      await poService.create({
        supplier: supplierId,
        items: cart.map(({ item, qtyOrdered, expectedPrice }) => ({
          item,
          qtyOrdered,
          expectedPrice,
        })),
        notes,
      });
      setCreateOpen(false);
      resetCreateForm();
      load(1);
    } catch (err) {
      alert(err.response?.data?.message || "PO create nahi ho saka");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          Purchase Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateOpen(true)}
        >
          Create PO
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ ...fieldSx, width: 200 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="DRAFT">Draft</MenuItem>
          <MenuItem value="SENT">Sent</MenuItem>
          <MenuItem value="CONFIRMED">Confirmed</MenuItem>
          <MenuItem value="PARTIALLY_RECEIVED">Partially Received</MenuItem>
          <MenuItem value="RECEIVED">Received</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
        </TextField>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={cellSx}>PO #</TableCell>
              <TableCell sx={cellSx}>Supplier</TableCell>
              <TableCell sx={cellSx}>Items</TableCell>
              <TableCell sx={cellSx}>Status</TableCell>
              <TableCell sx={cellSx}>Created</TableCell>
              <TableCell sx={cellSx}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} sx={cellSx}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : pos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={cellSx}>
                  Koi PO nahi mila
                </TableCell>
              </TableRow>
            ) : (
              pos.map((po) => (
                <TableRow key={po._id}>
                  <TableCell sx={cellSx}>{po.poNumber}</TableCell>
                  <TableCell sx={cellSx}>{po.supplier?.name || "—"}</TableCell>
                  <TableCell sx={cellSx}>{po.items.length}</TableCell>
                  <TableCell sx={cellSx}>
                    <Chip
                      label={po.status.replace("_", " ")}
                      size="small"
                      color={STATUS_COLOR[po.status]}
                    />
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {new Date(po.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <Button
                      size="small"
                      component={Link}
                      to={`/pos/purchase-orders/${po._id}`}
                    >
                      Track
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Create Purchase Order</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
            <Typography sx={{ fontSize: 13, width: 90 }}>Supplier:</Typography>
            <TextField
              size="small"
              sx={{ ...fieldSx, width: 260 }}
              value={supplierName}
              InputProps={{ readOnly: true }}
            />
            <IconButton
              size="small"
              onClick={() => setSupplierSearchOpen(true)}
            >
              <Search fontSize="small" />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              mb: 2,
              alignItems: "flex-end",
              position: "relative",
            }}
          >
            <Box sx={{ flex: 1, position: "relative" }}>
              <Typography sx={{ fontSize: 12 }}>Item Name</Typography>
              <TextField
                inputRef={nameRef}
                size="small"
                fullWidth
                sx={fieldSx}
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
              />
              {itemResults.length > 0 && (
                <Paper
                  sx={{
                    position: "absolute",
                    zIndex: 10,
                    width: "100%",
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  <List dense>
                    {itemResults.map((it) => (
                      <ListItemButton key={it._id} onClick={() => pickItem(it)}>
                        <ListItemText
                          primary={it.itemName}
                          secondary={`Barcode: ${it.barcode} | Current stock: ${it.stockQty}`}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12 }}>Qty</Typography>
              <TextField
                size="small"
                sx={{ ...fieldSx, width: 80 }}
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12 }}>Expected Price</Typography>
              <TextField
                size="small"
                sx={{ ...fieldSx, width: 110 }}
                type="number"
                value={expectedPrice}
                onChange={(e) => setExpectedPrice(e.target.value)}
              />
            </Box>
            <Button
              variant="contained"
              sx={{ bgcolor: "#43a047" }}
              onClick={addToCart}
            >
              Add
            </Button>
          </Box>

          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#e0e0e0" }}>
                <TableCell sx={cellSx}>Item</TableCell>
                <TableCell sx={cellSx}>Barcode</TableCell>
                <TableCell sx={cellSx}>Qty Ordered</TableCell>
                <TableCell sx={cellSx}>Expected Price</TableCell>
                <TableCell sx={cellSx}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cart.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell sx={cellSx}>{row.itemName}</TableCell>
                  <TableCell sx={cellSx}>{row.barcode}</TableCell>
                  <TableCell sx={cellSx} align="center">
                    {row.qtyOrdered}
                  </TableCell>
                  <TableCell sx={cellSx} align="right">
                    {row.expectedPrice}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeRow(idx)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <TextField
            label="Notes (optional)"
            size="small"
            fullWidth
            multiline
            rows={2}
            sx={{ ...fieldSx, mt: 2 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitPO} disabled={saving}>
            {saving ? "Creating..." : "Create PO"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={supplierSearchOpen}
        onClose={() => setSupplierSearchOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Search Supplier</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={supplierSearchText}
            onChange={(e) => setSupplierSearchText(e.target.value)}
            sx={{ mb: 1 }}
          />
          <List dense>
            {supplierResults.map((s) => (
              <ListItemButton key={s._id} onClick={() => selectSupplier(s)}>
                <ListItemText primary={s.name} secondary={s.phone} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierSearchOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
