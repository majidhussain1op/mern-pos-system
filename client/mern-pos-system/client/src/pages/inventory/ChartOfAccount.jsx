import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Chip,
  Tooltip,
  Alert,
  Paper,
} from "@mui/material";
import {
  ExpandMore,
  ChevronRight,
  Add,
  Edit,
  Delete as DeleteOutline,
  AccountTree,
} from "@mui/icons-material";
import { COLORS, cellSx, fieldSx } from "../pos/PosLayout";
import accountService from "../../services/accountService";

const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Revenue", "Expense"];

const emptyForm = {
  code: "",
  name: "",
  type: "Asset",
  parent: null,
  isPostingAccount: true,
};

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await accountService.getAll();
      setAccounts(data);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load Chart of Accounts",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Build a parent -> children map so we can render a 4-level tree
  // from the flat list the API returns.
  const childrenByParent = useMemo(() => {
    const map = {};
    accounts.forEach((acc) => {
      const key = acc.parent || "root";
      if (!map[key]) map[key] = [];
      map[key].push(acc);
    });
    Object.keys(map).forEach((key) =>
      map[key].sort((a, b) => (a.code || "").localeCompare(b.code || "")),
    );
    return map;
  }, [accounts]);

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const openAddDialog = (parentAccount = null) => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      parent: parentAccount ? parentAccount._id : null,
      type: parentAccount ? parentAccount.type : "Asset",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (account) => {
    setEditingId(account._id);
    setForm({
      code: account.code,
      name: account.name,
      type: account.type,
      parent: account.parent || null,
      isPostingAccount: account.isPostingAccount,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError("Code and Name are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await accountService.update(editingId, form);
      } else {
        await accountService.create(form);
      }
      closeDialog();
      await loadAccounts();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save account");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (account) => {
    if (
      !window.confirm(
        `Deactivate "${account.name}"? This won't delete history.`,
      )
    ) {
      return;
    }
    try {
      await accountService.deactivate(account._id);
      await loadAccounts();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to deactivate account");
    }
  };

  // Recursive row — supports the 4-level hierarchy (root/Group/Group/Posting)
  const renderNode = (account, depth = 0) => {
    const kids = childrenByParent[account._id] || [];
    const hasChildren = kids.length > 0;
    const isOpen = expanded[account._id] ?? depth < 1;

    return (
      <Box key={account._id}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            py: 0.75,
            pl: depth * 3 + 1,
            pr: 1,
            borderBottom: `1px solid ${COLORS?.border || "#eee"}`,
            "&:hover": { backgroundColor: COLORS?.hoverBg || "#fafafa" },
          }}
        >
          <IconButton
            size="small"
            onClick={() => hasChildren && toggleExpand(account._id)}
            sx={{ visibility: hasChildren ? "visible" : "hidden", mr: 0.5 }}
          >
            {isOpen ? (
              <ExpandMore fontSize="small" />
            ) : (
              <ChevronRight fontSize="small" />
            )}
          </IconButton>

          <Typography
            sx={{ width: 90, fontFamily: "monospace", color: "text.secondary" }}
          >
            {account.code}
          </Typography>

          <Typography
            sx={{ flex: 1, fontWeight: account.isPostingAccount ? 400 : 600 }}
          >
            {account.name}
          </Typography>

          <Chip
            size="small"
            label={account.isPostingAccount ? "Posting" : "Group"}
            color={account.isPostingAccount ? "default" : "primary"}
            variant={account.isPostingAccount ? "outlined" : "filled"}
            sx={{ mr: 1 }}
          />

          {account.isPostingAccount && typeof account.balance === "number" && (
            <Typography sx={{ width: 120, textAlign: "right", mr: 1 }}>
              {account.balance.toLocaleString()}
            </Typography>
          )}

          <Tooltip title="Add child account">
            <span>
              <IconButton
                size="small"
                onClick={() => openAddDialog(account)}
                disabled={depth >= 3}
              >
                <Add fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEditDialog(account)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Deactivate">
            <IconButton size="small" onClick={() => handleDeactivate(account)}>
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {hasChildren && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            {kids.map((child) => renderNode(child, depth + 1))}
          </Collapse>
        )}
      </Box>
    );
  };

  const rootNodes = childrenByParent["root"] || [];

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AccountTree color="primary" />
          <Typography variant="h6">Chart of Accounts</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => openAddDialog(null)}
        >
          Add Root Account
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined">
        {loading ? (
          <Typography
            sx={{ p: 3, textAlign: "center", color: "text.secondary" }}
          >
            Loading...
          </Typography>
        ) : rootNodes.length === 0 ? (
          <Typography
            sx={{ p: 3, textAlign: "center", color: "text.secondary" }}
          >
            No accounts yet — add your first root account (e.g. Assets,
            Liabilities).
          </Typography>
        ) : (
          rootNodes.map((acc) => renderNode(acc, 0))
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{editingId ? "Edit Account" : "Add Account"}</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
        >
          <TextField
            label="Code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            sx={fieldSx}
            autoFocus
          />
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={fieldSx}
          />
          <TextField
            select
            label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            sx={fieldSx}
          >
            {ACCOUNT_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="body2" color="text.secondary">
            {editingId
              ? "Level and posting status are fixed at creation and can't change here."
              : form.parent
                ? "This will be created one level below its parent — a posting account once it reaches level 4."
                : "This will be created as a level 1 root (group) account."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
