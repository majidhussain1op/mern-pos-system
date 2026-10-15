import { useState } from "react";
import useSWR from "swr";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import {
  getAllCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getDueList,
} from "../../services/CustomerApi";
import { COLORS } from "../../pages/pos/PosLayout";

const fetcher = () => getAllCustomers();

export default function CustomerList() {
  const navigate = useNavigate();
  const { data, isLoading, mutate } = useSWR("customers", fetcher);
  const { data: dueData } = useSWR("due-list", getDueList);

  const [search, setSearch] = useState("");

  // Add dialog
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [editId, setEditId] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState(null); // { _id, name }
  const [deleting, setDeleting] = useState(false);

  const customers = data?.customers || [];
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createCustomer(form);
      await mutate();
      setForm({ name: "", phone: "", address: "" });
      setOpenAdd(false);
    } catch (err) {
      alert(err?.response?.data?.message || "Customer add nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (c) => {
    setEditId(c._id);
    setEditForm({
      name: c.name,
      phone: c.phone || "",
      address: c.address || "",
    });
    setOpenEdit(true);
  };

  const handleUpdate = async () => {
    if (!editForm.name.trim()) return;
    setUpdating(true);
    try {
      await updateCustomer(editId, editForm);
      await mutate();
      setOpenEdit(false);
      setEditId(null);
    } catch (err) {
      alert(err?.response?.data?.message || "Customer update nahi hua");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCustomer(deleteTarget._id);
      await mutate();
      setDeleteTarget(null);
    } catch (err) {
      alert(err?.response?.data?.message || "Customer delete nahi hua");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<PointOfSaleIcon />}
            onClick={() => navigate("/fill-receipt")}
            sx={{ borderRadius: 0 }}
          >
            Nexus POS
          </Button>
          <Typography variant="h5" fontWeight={700}>
            Customers
          </Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setOpenAdd(true)}
        >
          Add Customer
        </Button>
      </Stack>

      {/* Total Receivable summary */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          bgcolor: COLORS.totalBox,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Typography fontWeight={600}>Total Receivable (Udhar)</Typography>
        <Typography fontWeight={700}>
          Rs. {dueData?.totalReceivable?.toLocaleString() || 0}
        </Typography>
      </Paper>

      <TextField
        fullWidth
        size="small"
        placeholder="Search customer by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      <Paper sx={{ border: `1px solid ${COLORS.border}` }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: COLORS.header }}>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Koi customer nahi mila
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c) => (
              <TableRow key={c._id} hover>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.phone || "-"}</TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    label={`Rs. ${c.balance?.toLocaleString() || 0}`}
                    color={
                      c.balance > 0
                        ? "error"
                        : c.balance < 0
                          ? "success"
                          : "default"
                    }
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/customers/${c._id}/statement`)}
                    title="Statement"
                  >
                    <ReceiptLongIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => openEditDialog(c)}
                    title="Edit"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleteTarget(c)}
                    title="Delete"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Add Customer Dialog */}
      <Dialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <TextField
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <TextField
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
          <Button variant="contained" disabled={saving} onClick={handleAdd}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Edit Customer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              autoFocus
            />
            <TextField
              label="Phone"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm({ ...editForm, phone: e.target.value })
              }
            />
            <TextField
              label="Address"
              value={editForm.address}
              onChange={(e) =>
                setEditForm({ ...editForm, address: e.target.value })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={updating}
            onClick={handleUpdate}
          >
            {updating ? "Saving..." : "Update"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Customer Delete Karein?</DialogTitle>
        <DialogContent>
          <Typography>
            Kya aap <strong>{deleteTarget?.name}</strong> ko delete karna chahte
            hain? Ye action undo nahi ho sakta.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
