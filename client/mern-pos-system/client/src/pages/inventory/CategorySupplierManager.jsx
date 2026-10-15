import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
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
  Alert,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import { cellSx, fieldSx } from "../pos/PosLayout";
import categoryService from "../../services/CategoryServices";
import supplierService from "../../services/SupplierServices";

const emptySupplier = { name: "", phone: "", address: "" };

export default function CategorySupplierManager() {
  const [tab, setTab] = useState(0); // 0 = Categories, 1 = Suppliers
  const [error, setError] = useState("");

  // ---- Categories ----
  const [categories, setCategories] = useState([]);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [catName, setCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  const loadCategories = async () => {
    try {
      const { data } = await categoryService.getAll();
      setCategories(data.categories);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load categories");
    }
  };

  const openAddCat = () => {
    setEditingCatId(null);
    setCatName("");
    setCatDialogOpen(true);
  };

  const openEditCat = (cat) => {
    setEditingCatId(cat._id);
    setCatName(cat.name);
    setCatDialogOpen(true);
  };

  const submitCategory = async () => {
    if (!catName.trim()) return setError("Category naam zaroori hai");
    setCatSaving(true);
    try {
      if (editingCatId) {
        await categoryService.update(editingCatId, catName.trim());
      } else {
        await categoryService.create(catName.trim());
      }
      setCatDialogOpen(false);
      loadCategories();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setCatSaving(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Ye category delete karni hai?")) return;
    try {
      await categoryService.remove(id);
      loadCategories();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  // ---- Suppliers ----
  const [suppliers, setSuppliers] = useState([]);
  const [supDialogOpen, setSupDialogOpen] = useState(false);
  const [editingSupId, setEditingSupId] = useState(null);
  const [supForm, setSupForm] = useState(emptySupplier);
  const [supSaving, setSupSaving] = useState(false);

  const loadSuppliers = async () => {
    try {
      const { data } = await supplierService.getAll();
      setSuppliers(data.suppliers);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load suppliers");
    }
  };

  const openAddSup = () => {
    setEditingSupId(null);
    setSupForm(emptySupplier);
    setSupDialogOpen(true);
  };

  const openEditSup = (sup) => {
    setEditingSupId(sup._id);
    setSupForm({
      name: sup.name,
      phone: sup.phone || "",
      address: sup.address || "",
    });
    setSupDialogOpen(true);
  };

  const submitSupplier = async () => {
    if (!supForm.name.trim())
      return setError("Supplier/Manufacturer naam zaroori hai");
    setSupSaving(true);
    try {
      if (editingSupId) {
        await supplierService.update(editingSupId, supForm);
      } else {
        await supplierService.create(supForm);
      }
      setSupDialogOpen(false);
      loadSuppliers();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSupSaving(false);
    }
  };

  const deleteSupplier = async (id) => {
    if (!window.confirm("Ye supplier/manufacturer delete karna hai?")) return;
    try {
      await supplierService.remove(id);
      loadSuppliers();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  useEffect(() => {
    loadCategories();
    loadSuppliers();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Categories & Suppliers
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Categories" />
        <Tab label="Suppliers / Manufacturers" />
      </Tabs>

      {tab === 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openAddCat}
            >
              Add Category
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#e0e0e0" }}>
                <TableCell sx={cellSx}>Name</TableCell>
                <TableCell sx={cellSx}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} sx={cellSx}>
                    Koi category nahi hai
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat._id}>
                    <TableCell sx={cellSx}>{cat.name}</TableCell>
                    <TableCell sx={cellSx}>
                      <IconButton size="small" onClick={() => openEditCat(cat)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteCategory(cat._id)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {tab === 1 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openAddSup}
            >
              Add Supplier
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#e0e0e0" }}>
                <TableCell sx={cellSx}>Name</TableCell>
                <TableCell sx={cellSx}>Phone</TableCell>
                <TableCell sx={cellSx}>Address</TableCell>
                <TableCell sx={cellSx}>Balance (Payable)</TableCell>
                <TableCell sx={cellSx}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={cellSx}>
                    Koi supplier nahi hai
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((sup) => (
                  <TableRow key={sup._id}>
                    <TableCell sx={cellSx}>{sup.name}</TableCell>
                    <TableCell sx={cellSx}>{sup.phone || "—"}</TableCell>
                    <TableCell sx={cellSx}>{sup.address || "—"}</TableCell>
                    <TableCell sx={cellSx}>Rs {sup.balance}</TableCell>
                    <TableCell sx={cellSx}>
                      <IconButton size="small" onClick={() => openEditSup(sup)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteSupplier(sup._id)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Category Add/Edit Dialog */}
      <Dialog
        open={catDialogOpen}
        onClose={() => setCatDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {editingCatId ? "Edit Category" : "Add Category"}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="Category Name"
            size="small"
            fullWidth
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            sx={fieldSx}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submitCategory}
            disabled={catSaving}
          >
            {catSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Supplier Add/Edit Dialog */}
      <Dialog
        open={supDialogOpen}
        onClose={() => setSupDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingSupId ? "Edit Supplier" : "Add Supplier"}
        </DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
        >
          <TextField
            label="Name"
            size="small"
            fullWidth
            value={supForm.name}
            onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
            sx={fieldSx}
            autoFocus
          />
          <TextField
            label="Phone"
            size="small"
            fullWidth
            value={supForm.phone}
            onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
            sx={fieldSx}
          />
          <TextField
            label="Address"
            size="small"
            fullWidth
            value={supForm.address}
            onChange={(e) =>
              setSupForm({ ...supForm, address: e.target.value })
            }
            sx={fieldSx}
          />
          {editingSupId && (
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              Balance yahan se edit nahi hoti — payment transactions se update
              hoti hai.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submitSupplier}
            disabled={supSaving}
          >
            {supSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
