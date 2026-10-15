import { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { Search, Add, Delete } from "@mui/icons-material";
import PosLayout, { cellSx, fieldSx } from "../pos/PosLayout";
import api from "../../services/api";
import purchaseReturnService from "../../services/purchaseReturnServices";

export default function PurchaseReturn() {
  const [supplierId, setSupplierId] = useState(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [supplierSearchText, setSupplierSearchText] = useState("");
  const [supplierResults, setSupplierResults] = useState([]);

  const [nameQuery, setNameQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [qty, setQty] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState("");

  const [cart, setCart] = useState([]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const nameRef = useRef(null);

  useEffect(() => {
    if (!nameQuery.trim()) return setSearchResults([]);
    const delay = setTimeout(async () => {
      const { data } = await api.get(`/items/search-name?q=${nameQuery}`);
      setSearchResults(data.items);
    }, 250);
    return () => clearTimeout(delay);
  }, [nameQuery]);

  useEffect(() => {
    if (!supplierSearchOpen) return;
    const delay = setTimeout(async () => {
      const { data } = await api.get("/manufacturers/search", {
        params: { q: supplierSearchText },
      });
      setSupplierResults(data.suppliers || []);
    }, 250);
    return () => clearTimeout(delay);
  }, [supplierSearchText, supplierSearchOpen]);

  const selectSupplier = (s) => {
    setSupplierId(s._id);
    setSupplierName(s.name);
    setSupplierSearchOpen(false);
    setSupplierSearchText("");
  };

  const pickItem = (item) => {
    setSelectedItem(item);
    setPurchasePrice(item.purchasePrice || "");
    setSearchResults([]);
    setNameQuery(item.itemName);
  };

  const addToCart = () => {
    if (!selectedItem) return alert("Pehle item select karo");
    if (!qty || qty <= 0) return alert("Qty valid honi chahiye");
    if (Number(qty) > selectedItem.stockQty) {
      return alert(
        `Stock mein sirf ${selectedItem.stockQty} hai, itna return nahi ho sakta`,
      );
    }
    setCart((prev) => [
      ...prev,
      {
        item: selectedItem._id,
        barcode: selectedItem.barcode,
        itemName: selectedItem.itemName,
        currentStock: selectedItem.stockQty,
        qty: Number(qty),
        purchasePrice: Number(purchasePrice),
        lineTotal: Number(qty) * Number(purchasePrice),
      },
    ]);
    setSelectedItem(null);
    setNameQuery("");
    setQty(1);
    setPurchasePrice("");
    nameRef.current?.focus();
  };

  const removeRow = (idx) =>
    setCart((prev) => prev.filter((_, i) => i !== idx));
  const totalAmount = cart.reduce((s, r) => s + r.lineTotal, 0);

  const submitReturn = async () => {
    if (!supplierId) return alert("Supplier select karo");
    if (cart.length === 0) return alert("Cart khali hai");
    setSaving(true);
    try {
      const { data } = await purchaseReturnService.create({
        supplier: supplierId,
        items: cart.map(({ item, qty, purchasePrice }) => ({
          item,
          qty,
          purchasePrice,
        })),
        reason,
      });
      alert(`Purchase Return saved: ${data.purchaseReturn.returnNo}`);
      setCart([]);
      setReason("");
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PosLayout>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>
          Purchase Return
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
          <Typography sx={{ fontSize: 13, width: 90 }}>Supplier:</Typography>
          <TextField
            size="small"
            sx={{ ...fieldSx, width: 220 }}
            value={supplierName}
            InputProps={{ readOnly: true }}
          />
          <IconButton size="small" onClick={() => setSupplierSearchOpen(true)}>
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
            {searchResults.length > 0 && (
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
                  {searchResults.map((it) => (
                    <ListItemButton key={it._id} onClick={() => pickItem(it)}>
                      <ListItemText
                        primary={it.itemName}
                        secondary={`Barcode: ${it.barcode} | Stock: ${it.stockQty}`}
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
            <Typography sx={{ fontSize: 12 }}>Purchase Price</Typography>
            <TextField
              size="small"
              sx={{ ...fieldSx, width: 100 }}
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
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
              <TableCell sx={cellSx}>Barcode</TableCell>
              <TableCell sx={cellSx}>Item</TableCell>
              <TableCell sx={cellSx}>Qty</TableCell>
              <TableCell sx={cellSx}>Price</TableCell>
              <TableCell sx={cellSx}>Total</TableCell>
              <TableCell sx={cellSx}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cart.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell sx={cellSx}>{row.barcode}</TableCell>
                <TableCell sx={cellSx}>{row.itemName}</TableCell>
                <TableCell sx={cellSx} align="center">
                  {row.qty}
                </TableCell>
                <TableCell sx={cellSx} align="right">
                  {row.purchasePrice}
                </TableCell>
                <TableCell sx={cellSx} align="right">
                  {row.lineTotal.toFixed(2)}
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

        <Box sx={{ display: "flex", gap: 2, mt: 2, alignItems: "flex-end" }}>
          <TextField
            label="Reason"
            size="small"
            sx={{ ...fieldSx, flex: 1 }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
            Total: {totalAmount.toFixed(2)}
          </Typography>
          <Button
            variant="contained"
            sx={{ bgcolor: "#c62828" }}
            onClick={submitReturn}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Return"}
          </Button>
        </Box>
      </Paper>

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
    </PosLayout>
  );
}
