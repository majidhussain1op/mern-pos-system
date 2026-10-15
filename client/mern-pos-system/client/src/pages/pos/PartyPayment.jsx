import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  List,
  ListItemButton,
  ListItemText,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import PosLayout, { cellSx, fieldSx } from "./PosLayout";
import api from "../../services/api";

// mode: "RECEIVE" (from customer) or "PAY" (to supplier)
export default function PartyPayment({ mode }) {
  const partyType = mode === "RECEIVE" ? "Customer" : "Supplier";
  const endpoint =
    mode === "RECEIVE" ? "/customers/search" : "/suppliers/search";
  const listKey = mode === "RECEIVE" ? "customers" : "suppliers";

  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [party, setParty] = useState(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!searchText.trim()) return setResults([]);
    const delay = setTimeout(async () => {
      const { data } = await api.get(`${endpoint}?q=${searchText}`);
      setResults(data[listKey]);
    }, 250);
    return () => clearTimeout(delay);
  }, [searchText]);

  const selectParty = async (p) => {
    setParty(p);
    setSearchText("");
    setResults([]);
    const { data } = await api.get(
      `/payments?partyType=${partyType}&party=${p._id}`,
    );
    setHistory(data.payments);
  };

  const submit = async () => {
    if (!party) return alert("Pehle customer/supplier select karo");
    if (!amount || amount <= 0) return alert("Amount valid honi chahiye");
    setSaving(true);
    try {
      await api.post("/payments", {
        type: mode,
        partyType,
        party: party._id,
        amount: Number(amount),
        method,
        remarks,
      });
      alert("Payment saved");
      setAmount("");
      setRemarks("");
      const { data } = await api.get(
        `/payments?partyType=${partyType}&party=${party._id}`,
      );
      setHistory(data.payments);
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PosLayout>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>
          {mode === "RECEIVE"
            ? "Receive Payment (from Customer)"
            : "Pay Supplier"}
        </Typography>

        <Box sx={{ display: "flex", gap: 2, position: "relative" }}>
          <Box sx={{ flex: 1, position: "relative" }}>
            <TextField
              size="small"
              fullWidth
              placeholder={`Search ${partyType.toLowerCase()}...`}
              value={party ? party.name : searchText}
              onChange={(e) => {
                setParty(null);
                setSearchText(e.target.value);
              }}
              sx={fieldSx}
            />
            {results.length > 0 && (
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
                  {results.map((r) => (
                    <ListItemButton key={r._id} onClick={() => selectParty(r)}>
                      <ListItemText
                        primary={r.name}
                        secondary={`Balance: ${r.balance}`}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            )}
          </Box>
        </Box>

        {party && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              bgcolor: "#f5deb3",
              border: "1px solid #9e9e9e",
            }}
          >
            <Typography sx={{ fontSize: 13 }}>
              {party.name} — Current balance: <b>{party.balance}</b>{" "}
              {party.balance > 0
                ? mode === "RECEIVE"
                  ? "(receivable)"
                  : "(payable)"
                : ""}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 2, mt: 2, alignItems: "flex-end" }}>
          <Box>
            <Typography sx={{ fontSize: 12 }}>Amount</Typography>
            <TextField
              size="small"
              type="number"
              sx={{ ...fieldSx, width: 140 }}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12 }}>Method</Typography>
            <Select
              size="small"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              sx={{ width: 120 }}
            >
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="Bank">Bank</MenuItem>
              <MenuItem value="Cheque">Cheque</MenuItem>
            </Select>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 12 }}>Remarks</Typography>
            <TextField
              size="small"
              fullWidth
              sx={fieldSx}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </Box>
          <Button
            variant="contained"
            sx={{ bgcolor: mode === "RECEIVE" ? "#43a047" : "#c62828" }}
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Saving..." : mode === "RECEIVE" ? "Receive" : "Pay"}
          </Button>
        </Box>

        {history.length > 0 && (
          <>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mt: 3, mb: 1 }}>
              Recent Transactions
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#e0e0e0" }}>
                  <TableCell sx={cellSx}>Date</TableCell>
                  <TableCell sx={cellSx}>Amount</TableCell>
                  <TableCell sx={cellSx}>Method</TableCell>
                  <TableCell sx={cellSx}>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h._id}>
                    <TableCell sx={cellSx}>
                      {new Date(h.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell sx={cellSx} align="right">
                      {h.amount}
                    </TableCell>
                    <TableCell sx={cellSx}>{h.method}</TableCell>
                    <TableCell sx={cellSx}>{h.remarks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Paper>
    </PosLayout>
  );
}
