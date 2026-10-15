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
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import PosLayout, { cellSx, fieldSx } from "./PosLayout";
import api from "../../services/api";

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    debitAccount: "",
    creditAccount: "",
    amount: "",
    narration: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await api.get("/journal");
    setEntries(data.entries);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.debitAccount || !form.creditAccount || !form.amount) {
      return alert("Debit account, Credit account, aur Amount zaroori hain");
    }
    setSaving(true);
    try {
      await api.post("/journal", { ...form, amount: Number(form.amount) });
      setForm({
        debitAccount: "",
        creditAccount: "",
        amount: "",
        narration: "",
      });
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Ye entry delete karni hai?")) return;
    await api.delete(`/journal/${id}`);
    load();
  };

  return (
    <PosLayout>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>
          New Journal Entry
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "flex-end" }}>
          <TextField
            label="Debit Account"
            size="small"
            value={form.debitAccount}
            onChange={(e) => setForm({ ...form, debitAccount: e.target.value })}
          />
          <TextField
            label="Credit Account"
            size="small"
            value={form.creditAccount}
            onChange={(e) =>
              setForm({ ...form, creditAccount: e.target.value })
            }
          />
          <TextField
            label="Amount"
            type="number"
            size="small"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <TextField
            label="Narration"
            size="small"
            sx={{ flex: 1 }}
            value={form.narration}
            onChange={(e) => setForm({ ...form, narration: e.target.value })}
          />
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Add Entry"}
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#e0e0e0" }}>
              <TableCell sx={cellSx}>Date</TableCell>
              <TableCell sx={cellSx}>Debit</TableCell>
              <TableCell sx={cellSx}>Credit</TableCell>
              <TableCell sx={cellSx}>Amount</TableCell>
              <TableCell sx={cellSx}>Narration</TableCell>
              <TableCell sx={cellSx}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e._id}>
                <TableCell sx={cellSx}>
                  {new Date(e.date).toLocaleDateString()}
                </TableCell>
                <TableCell sx={cellSx}>{e.debitAccount}</TableCell>
                <TableCell sx={cellSx}>{e.creditAccount}</TableCell>
                <TableCell sx={cellSx} align="right">
                  {e.amount}
                </TableCell>
                <TableCell sx={cellSx}>{e.narration}</TableCell>
                <TableCell sx={cellSx}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => remove(e._id)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </PosLayout>
  );
}
