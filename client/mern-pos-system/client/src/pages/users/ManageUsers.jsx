import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Avatar,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Person,
  Email,
  Lock,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  AdminPanelSettings,
  ToggleOn,
  ToggleOff,
} from "@mui/icons-material";
import api from "../../services/api";

const roleColors = {
  ADMIN: { bg: "#eef2ff", color: "#4f46e5" },
  MANAGER: { bg: "#ecfeff", color: "#0891b2" },
  CASHIER: { bg: "#f0fdf4", color: "#16a34a" },
};

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "CASHIER",
  });

  const resetForm = () => {
    setEditId(null);
    setForm({ name: "", email: "", password: "", role: "CASHIER" });
  };

  // ================= FETCH =================
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users");
      setUsers(res.data?.data || []);
    } catch (err) {
      console.log("FETCH USERS ERROR:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ================= SAVE (CREATE / UPDATE) =================
  const handleSave = async () => {
    if (!form.name || !form.email || (!editId && !form.password)) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setSaving(true);

      if (editId) {
        const payload = { ...form };
        if (!payload.password) delete payload.password; // don't overwrite if empty
        await api.put(`/users/${editId}`, payload);
        alert("User updated successfully ✅");
      } else {
        await api.post("/users", form);
        alert("User created successfully 🎉");
      }

      resetForm();
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Error saving user");
    } finally {
      setSaving(false);
    }
  };

  // ================= EDIT =================
  const handleEdit = (u) => {
    setEditId(u._id);
    setForm({
      name: u.name || "",
      email: u.email || "",
      password: "",
      role: u.role || "CASHIER",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ================= DELETE =================
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/users/${deleteTarget._id}`);
      alert("User deleted 🗑️");
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Error deleting user");
    }
  };

  // ================= TOGGLE ACTIVE =================
  const toggleActive = async (id) => {
    try {
      await api.patch(`/users/${id}/toggle-active`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Error toggling status");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
        👥 Manage Staff
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Create and manage Admin, Manager & Cashier accounts
      </Typography>

      {/* ===== FORM ===== */}
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 4, border: "1px solid #e2e8f0", mb: 4 }}
      >
        <Typography fontWeight="bold" sx={{ mb: 2 }}>
          {editId ? "✏️ Edit Staff Member" : "➕ Add New Staff Member"}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email Address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={editId ? "New Password (optional)" : "Password"}
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={form.role}
                label="Role"
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                startAdornment={
                  <InputAdornment position="start">
                    <AdminPanelSettings fontSize="small" sx={{ ml: 1 }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="MANAGER">Manager</MenuItem>
                <MenuItem value="CASHIER">Cashier</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{
              borderRadius: 2.5,
              px: 4,
              py: 1.2,
              fontWeight: 700,
              textTransform: "none",
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              "&:hover": {
                background: "linear-gradient(135deg,#4f46e5,#4338ca)",
              },
            }}
          >
            {saving ? (
              <CircularProgress size={22} sx={{ color: "#fff" }} />
            ) : editId ? (
              "Update Staff"
            ) : (
              "Create Staff"
            )}
          </Button>

          {editId && (
            <Button
              variant="outlined"
              color="error"
              onClick={resetForm}
              sx={{ borderRadius: 2.5, px: 3, textTransform: "none" }}
            >
              Cancel
            </Button>
          )}
        </Box>
      </Paper>

      {/* ===== USER LIST ===== */}
      <Typography fontWeight="bold" sx={{ mb: 2 }}>
        Staff Directory ({users.length})
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {users.map((u) => {
            const roleStyle = roleColors[u.role] || roleColors.CASHIER;

            return (
              <Grid item xs={12} sm={6} md={4} key={u._id}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 4,
                    border: "1px solid #e2e8f0",
                    transition: "0.25s",
                    "&:hover": {
                      boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                      transform: "translateY(-3px)",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      sx={{
                        bgcolor: roleStyle.bg,
                        color: roleStyle.color,
                        fontWeight: 700,
                      }}
                    >
                      {u.name?.charAt(0)?.toUpperCase() || "U"}
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight="bold" noWrap>
                        {u.name}
                      </Typography>
                      <Typography fontSize={12.5} color="text.secondary" noWrap>
                        {u.email}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}
                  >
                    <Chip
                      label={u.role}
                      size="small"
                      sx={{
                        bgcolor: roleStyle.bg,
                        color: roleStyle.color,
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    />
                    <Chip
                      label={u.active ? "Active" : "Inactive"}
                      size="small"
                      sx={{
                        bgcolor: u.active ? "#f0fdf4" : "#fef2f2",
                        color: u.active ? "#16a34a" : "#dc2626",
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    />
                  </Box>

                  <Box sx={{ display: "flex", gap: 1, mt: 2.5 }}>
                    <Button
                      size="small"
                      startIcon={<Edit sx={{ fontSize: 16 }} />}
                      onClick={() => handleEdit(u)}
                      sx={{
                        borderRadius: 2,
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: "none",
                        bgcolor: "#eef2ff",
                        color: "#4f46e5",
                        "&:hover": { bgcolor: "#4f46e5", color: "#fff" },
                      }}
                    >
                      Edit
                    </Button>

                    <Button
                      size="small"
                      startIcon={
                        u.active ? (
                          <ToggleOff sx={{ fontSize: 16 }} />
                        ) : (
                          <ToggleOn sx={{ fontSize: 16 }} />
                        )
                      }
                      onClick={() => toggleActive(u._id)}
                      sx={{
                        borderRadius: 2,
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: "none",
                        bgcolor: "#ecfeff",
                        color: "#0891b2",
                        "&:hover": { bgcolor: "#0891b2", color: "#fff" },
                      }}
                    >
                      {u.active ? "Deactivate" : "Activate"}
                    </Button>

                    <IconButton
                      size="small"
                      onClick={() => setDeleteTarget(u)}
                      sx={{
                        bgcolor: "#fef2f2",
                        color: "#dc2626",
                        "&:hover": { bgcolor: "#dc2626", color: "#fff" },
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ===== DELETE CONFIRM DIALOG ===== */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Staff Member?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <b>{deleteTarget?.name}</b>? This
            action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
