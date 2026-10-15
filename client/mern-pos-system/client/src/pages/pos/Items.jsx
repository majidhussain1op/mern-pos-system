import { useState, useEffect } from "react";
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
  Chip,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import PosLayout, { cellSx, fieldSx } from "./PosLayout";
import api from "../../services/api";

const emptyItem = {
  barcode: "",
  itemName: "",
  urduName: "",
  sellPrice: "",
  purchasePrice: "",
  stockQty: 0,
  minStockAlert: 5,
  unit: "pcs",
  expiryDate: "", // naya
  gstRate: "", // naya - khaali chhodo to Settings ka default rate use hoga
};

// Item table row mein expiry ko dikhane ke liye chhota helper
const expiryChip = (expiryDate) => {
  if (!expiryDate) return null;
  const days = Math.ceil(
    (new Date(expiryDate) - new Date()) / (24 * 60 * 60 * 1000),
  );
  if (days < 0)
    return <Chip label="Expired" size="small" color="error" sx={{ ml: 1 }} />;
  if (days <= 30)
    return (
      <Chip
        label={`${days}d left`}
        size="small"
        color="warning"
        sx={{ ml: 1 }}
      />
    );
  return null;
};

export default function Items() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyItem);
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    try {
      const { data } = await api.get("/items");
      setItems(data.items);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filtered = items.filter(
    (i) =>
      i.itemName.toLowerCase().includes(search.toLowerCase()) ||
      i.barcode.includes(search),
  );

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyItem);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      barcode: item.barcode,
      itemName: item.itemName,
      urduName: item.urduName || "",
      sellPrice: item.sellPrice,
      purchasePrice: item.purchasePrice,
      stockQty: item.stockQty,
      minStockAlert: item.minStockAlert,
      unit: item.unit,
      // Date input "YYYY-MM-DD" chahta hai, Mongo se poora ISO string aata hai
      expiryDate: item.expiryDate
        ? new Date(item.expiryDate).toISOString().slice(0, 10)
        : "",
      gstRate: item.gstRate ?? "",
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.barcode || !form.itemName || !form.sellPrice) {
      return alert("Barcode, Item Name, aur Sell Price zaroori hain");
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        expiryDate: form.expiryDate || null, // khaali string na jaye, null jaye
        gstRate: form.gstRate === "" ? null : Number(form.gstRate), // khaali = Settings default use hoga
      };
      if (editingId) {
        await api.put(`/items/${editingId}`, payload);
      } else {
        await api.post("/items", payload);
      }
      setDialogOpen(false);
      loadItems();
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id) => {
    if (!window.confirm("Ye item deactivate karna hai?")) return;
    try {
      await api.delete(`/items/${id}`);
      loadItems();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <PosLayout>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search barcode or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ ...fieldSx, width: 300 }}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            sx={{ bgcolor: "#43a047" }}
            onClick={openAdd}
          >
            Add Item
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#e0e0e0" }}>
              <TableCell sx={cellSx}>Barcode</TableCell>
              <TableCell sx={cellSx}>Item Name</TableCell>
              <TableCell sx={cellSx}>Sell Price</TableCell>
              <TableCell sx={cellSx}>Purchase Price</TableCell>
              <TableCell sx={cellSx}>Stock Qty</TableCell>
              <TableCell sx={cellSx}>Unit</TableCell>
              <TableCell sx={cellSx}>Expiry</TableCell>
              <TableCell sx={cellSx}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((item) => (
              <TableRow
                key={item._id}
                sx={{
                  bgcolor:
                    item.stockQty <= item.minStockAlert ? "#ffebee" : "#fff",
                }}
              >
                <TableCell sx={cellSx}>{item.barcode}</TableCell>
                <TableCell sx={cellSx}>{item.itemName}</TableCell>
                <TableCell sx={cellSx} align="right">
                  {item.sellPrice}
                </TableCell>
                <TableCell sx={cellSx} align="right">
                  {item.purchasePrice}
                </TableCell>
                <TableCell sx={cellSx} align="center">
                  {item.stockQty}
                </TableCell>
                <TableCell sx={cellSx}>{item.unit}</TableCell>
                <TableCell sx={cellSx}>
                  {item.expiryDate
                    ? new Date(item.expiryDate).toLocaleDateString()
                    : "—"}
                  {expiryChip(item.expiryDate)}
                </TableCell>
                <TableCell sx={cellSx}>
                  <IconButton size="small" onClick={() => openEdit(item)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => deactivate(item._id)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editingId ? "Edit Item" : "Add Item"}</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
        >
          <TextField
            label="Barcode"
            size="small"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          />
          <TextField
            label="Item Name"
            size="small"
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
          />
          <TextField
            label="Urdu Name"
            size="small"
            value={form.urduName}
            onChange={(e) => setForm({ ...form, urduName: e.target.value })}
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Sell Price"
              type="number"
              size="small"
              fullWidth
              value={form.sellPrice}
              onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
            />
            <TextField
              label="Purchase Price"
              type="number"
              size="small"
              fullWidth
              value={form.purchasePrice}
              onChange={(e) =>
                setForm({ ...form, purchasePrice: e.target.value })
              }
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Stock Qty"
              type="number"
              size="small"
              fullWidth
              value={form.stockQty}
              onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
              disabled={!!editingId}
            />
            <TextField
              label="Min Stock Alert"
              type="number"
              size="small"
              fullWidth
              value={form.minStockAlert}
              onChange={(e) =>
                setForm({ ...form, minStockAlert: e.target.value })
              }
            />
          </Box>
          <TextField
            label="Expiry Date (optional)"
            type="date"
            size="small"
            fullWidth
            value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            helperText="Khaali chhod do agar item expire nahi hota"
          />
          <TextField
            label="GST Rate % (optional)"
            type="number"
            size="small"
            fullWidth
            value={form.gstRate}
            onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
            helperText="Khaali chhod do to Settings ka default GST rate use hoga (kuch items exempt/0% ho sakte hain)"
          />
          {editingId && (
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              Stock qty yahan se edit nahi hoti — Purchase ya Stock Adjust
              screen use karo.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </PosLayout>
  );
}
