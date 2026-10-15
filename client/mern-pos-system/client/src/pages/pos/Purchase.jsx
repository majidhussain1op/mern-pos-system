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
import PosLayout, { cellSx, fieldSx } from "./PosLayout";
import api from "../../services/api";

export default function Purchase() {
  const [supplierId, setSupplierId] = useState(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [supplierSearchText, setSupplierSearchText] = useState("");
  const [supplierResults, setSupplierResults] = useState([]);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const [nameQuery, setNameQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [qty, setQty] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState("");

  const [cart, setCart] = useState([]);
  const [paidAmount, setPaidAmount] = useState(0);
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
      const { data } = await api.get(
        `/manufacturers/search?q=${supplierSearchText}`,
      );
      setSupplierResults(data.suppliers);
    }, 250);
    return () => clearTimeout(delay);
  }, [supplierSearchText, supplierSearchOpen]);

  const selectSupplier = (s) => {
    setSupplierId(s._id);
    setSupplierName(s.name);
    setSupplierSearchOpen(false);
    setSupplierSearchText("");
  };

  const submitNewSupplier = async () => {
    if (!newSupplier.name.trim()) return alert("Supplier ka naam likho");
    try {
      const { data } = await api.post("/manufacturers", newSupplier);
      selectSupplier(data.supplier);
      setAddSupplierOpen(false);
      setNewSupplier({ name: "", phone: "", address: "" });
    } catch (err) {
      alert(err.response?.data?.message || "Supplier add nahi ho saka");
    }
  };

  const pickItem = (item) => {
    setSelectedItem(item);
    setPurchasePrice(item.purchasePrice || item.sellPrice);
    setSearchResults([]);
    setNameQuery(item.itemName);
  };

  const addToCart = () => {
    if (!selectedItem) return alert("Pehle item select karo");
    if (!qty || qty <= 0) return alert("Qty valid honi chahiye");
    setCart((prev) => [
      ...prev,
      {
        item: selectedItem._id,
        barcode: selectedItem.barcode,
        itemName: selectedItem.itemName,
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

  const savePurchase = async () => {
    if (!supplierId) return alert("Supplier select karo");
    if (cart.length === 0) return alert("Cart khali hai");
    setSaving(true);
    try {
      const { data } = await api.post("/purchases", {
        supplier: supplierId,
        items: cart.map(({ item, qty, purchasePrice }) => ({
          item,
          qty,
          purchasePrice,
        })),
        paidAmount: Number(paidAmount),
      });
      alert(`Purchase saved: ${data.purchase.invoiceNo}`);
      setCart([]);
      setPaidAmount(0);
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PosLayout>
      <Paper variant="outlined" sx={{ p: 2 }}>
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
          <IconButton
            size="small"
            sx={{ bgcolor: "#7cb342", color: "#fff", borderRadius: "50%" }}
            onClick={() => setAddSupplierOpen(true)}
          >
            <Add fontSize="small" />
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
                        secondary={`Barcode: ${it.barcode}`}
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
              <TableCell sx={cellSx}>Purchase Price</TableCell>
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

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
            mt: 2,
            alignItems: "center",
          }}
        >
          <Typography sx={{ fontSize: 13 }}>Paid Amount:</Typography>
          <TextField
            size="small"
            type="number"
            sx={{ ...fieldSx, width: 120 }}
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
          />
          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
            Total: {totalAmount.toFixed(2)}
          </Typography>
          <Button
            variant="contained"
            sx={{ bgcolor: "#1565c0" }}
            onClick={savePurchase}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Purchase"}
          </Button>
        </Box>
      </Paper>

      {/* Supplier search dialog */}
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

      {/* Add supplier dialog */}
      <Dialog
        open={addSupplierOpen}
        onClose={() => setAddSupplierOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Add Supplier</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
        >
          <TextField
            label="Name"
            size="small"
            value={newSupplier.name}
            onChange={(e) =>
              setNewSupplier({ ...newSupplier, name: e.target.value })
            }
          />
          <TextField
            label="Phone"
            size="small"
            value={newSupplier.phone}
            onChange={(e) =>
              setNewSupplier({ ...newSupplier, phone: e.target.value })
            }
          />
          <TextField
            label="Address"
            size="small"
            value={newSupplier.address}
            onChange={(e) =>
              setNewSupplier({ ...newSupplier, address: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddSupplierOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitNewSupplier}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </PosLayout>
  );
}
