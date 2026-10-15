import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
} from "@mui/material";
import PosLayout, { cellSx, fieldSx } from "./PosLayout";
import api from "../../services/api";

export default function Stock() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [showLowOnly, setShowLowOnly] = useState(false);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustDirection, setAdjustDirection] = useState("IN");
  const [adjustReason, setAdjustReason] = useState("");

  const loadStock = async () => {
    const { data } = await api.get("/stock");
    setItems(data.items);
  };

  useEffect(() => {
    loadStock();
  }, []);

  const filtered = items
    .filter((i) => i.itemName.toLowerCase().includes(search.toLowerCase()))
    .filter((i) => (showLowOnly ? i.stockQty <= i.minStockAlert : true));

  const openAdjust = (item) => {
    setAdjustItem(item);
    setAdjustQty("");
    setAdjustDirection("IN");
    setAdjustReason("");
    setAdjustOpen(true);
  };

  const submitAdjust = async () => {
    if (!adjustQty || adjustQty <= 0) return alert("Qty valid honi chahiye");
    try {
      await api.post("/stock/adjust", {
        item: adjustItem._id,
        qty: Number(adjustQty),
        direction: adjustDirection,
        reason: adjustReason,
      });
      setAdjustOpen(false);
      loadStock();
    } catch (err) {
      alert(err.response?.data?.message || "Adjustment failed");
    }
  };

  return (
    <PosLayout>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ ...fieldSx, width: 260 }}
          />
          <Button
            variant={showLowOnly ? "contained" : "outlined"}
            color="warning"
            size="small"
            onClick={() => setShowLowOnly((p) => !p)}
          >
            {showLowOnly ? "Showing Low Stock Only" : "Show Low Stock Only"}
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#e0e0e0" }}>
              <TableCell sx={cellSx}>Barcode</TableCell>
              <TableCell sx={cellSx}>Item Name</TableCell>
              <TableCell sx={cellSx}>Category</TableCell>
              <TableCell sx={cellSx}>Stock Qty</TableCell>
              <TableCell sx={cellSx}>Min Alert</TableCell>
              <TableCell sx={cellSx}>Sell Price</TableCell>
              <TableCell sx={cellSx}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((item) => {
              const low = item.stockQty <= item.minStockAlert;
              return (
                <TableRow
                  key={item._id}
                  sx={{ bgcolor: low ? "#ffebee" : "#fff" }}
                >
                  <TableCell sx={cellSx}>{item.barcode}</TableCell>
                  <TableCell sx={cellSx}>{item.itemName}</TableCell>
                  <TableCell sx={cellSx}>{item.category?.name || ""}</TableCell>
                  <TableCell
                    sx={{
                      ...cellSx,
                      fontWeight: low ? 700 : 400,
                      color: low ? "#c62828" : "inherit",
                    }}
                    align="center"
                  >
                    {item.stockQty}
                  </TableCell>
                  <TableCell sx={cellSx} align="center">
                    {item.minStockAlert}
                  </TableCell>
                  <TableCell sx={cellSx} align="right">
                    {item.sellPrice}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <Button size="small" onClick={() => openAdjust(item)}>
                      Adjust
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Dialog
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Adjust Stock — {adjustItem?.itemName}</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
        >
          <Typography sx={{ fontSize: 13 }}>
            Current stock: {adjustItem?.stockQty}
          </Typography>
          <Select
            size="small"
            value={adjustDirection}
            onChange={(e) => setAdjustDirection(e.target.value)}
          >
            <MenuItem value="IN">Add Stock (IN)</MenuItem>
            <MenuItem value="OUT">Remove Stock (OUT)</MenuItem>
          </Select>
          <TextField
            label="Qty"
            type="number"
            size="small"
            value={adjustQty}
            onChange={(e) => setAdjustQty(e.target.value)}
          />
          <TextField
            label="Reason"
            size="small"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="e.g. damaged, recount"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitAdjust}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </PosLayout>
  );
}
