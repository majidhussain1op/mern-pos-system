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
  MenuItem,
  List,
  ListItemButton,
  ListItemText,
  Alert,
} from "@mui/material";
import { Delete, Print } from "@mui/icons-material";
import JsBarcode from "jsbarcode";
import { cellSx, fieldSx } from "../pos/PosLayout";
import api from "../../services/api";

const LABEL_SIZES = [
  {
    value: "small",
    label: "Small (25mm x 15mm)",
    width: "25mm",
    height: "15mm",
    fontSize: "6px",
    barHeight: 25,
  },
  {
    value: "medium",
    label: "Medium (40mm x 25mm)",
    width: "40mm",
    height: "25mm",
    fontSize: "8px",
    barHeight: 35,
  },
  {
    value: "large",
    label: "Large (50mm x 30mm)",
    width: "50mm",
    height: "30mm",
    fontSize: "10px",
    barHeight: 40,
  },
];

export default function BarcodePrint() {
  const [nameQuery, setNameQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [printList, setPrintList] = useState([]); // [{item, itemName, barcode, sellPrice, qty}]
  const [labelSize, setLabelSize] = useState("medium");
  const [showPrice, setShowPrice] = useState(true);
  const [error, setError] = useState("");

  const nameRef = useRef(null);

  useEffect(() => {
    if (!nameQuery.trim()) return setSearchResults([]);
    const delay = setTimeout(async () => {
      try {
        const { data } = await api.get(`/items/search-name?q=${nameQuery}`);
        setSearchResults(data.items);
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [nameQuery]);

  const addItem = (item) => {
    if (!item.barcode) {
      setError(
        `"${item.itemName}" ka koi barcode set nahi hai — pehle Items page se barcode add karo`,
      );
      return;
    }
    setError("");
    setPrintList((prev) => {
      const existing = prev.find((r) => r.item === item._id);
      if (existing) {
        return prev.map((r) =>
          r.item === item._id ? { ...r, qty: r.qty + 1 } : r,
        );
      }
      return [
        ...prev,
        {
          item: item._id,
          itemName: item.itemName,
          barcode: item.barcode,
          sellPrice: item.sellPrice,
          qty: 1,
        },
      ];
    });
    setSearchResults([]);
    setNameQuery("");
    nameRef.current?.focus();
  };

  const updateQty = (idx, qty) => {
    setPrintList((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], qty: Math.max(1, Number(qty) || 1) };
      return updated;
    });
  };

  const removeRow = (idx) =>
    setPrintList((prev) => prev.filter((_, i) => i !== idx));

  const totalLabels = printList.reduce((sum, r) => sum + r.qty, 0);

  // Har barcode ko canvas pe render karke PNG data-URL bana lete hain (print window mein <img> ke tor pe use hoga)
  const generateBarcodeDataUrl = (code) => {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, code, {
      format: "CODE128",
      displayValue: false, // number hum khud niche likhenge (styling control ke liye)
      margin: 0,
      height: 50,
    });
    return canvas.toDataURL("image/png");
  };

  const printLabels = () => {
    if (printList.length === 0) return alert("Print list khali hai");

    const size = LABEL_SIZES.find((s) => s.value === labelSize);

    // Har item ki qty ke hisaab se labels repeat karo
    const labelsHtml = printList
      .flatMap((row) => {
        const barcodeImg = generateBarcodeDataUrl(row.barcode);
        return Array.from({ length: row.qty }).map(
          () => `
          <div class="label">
            <div class="item-name">${row.itemName}</div>
            <img src="${barcodeImg}" class="barcode-img" />
            <div class="barcode-text">${row.barcode}</div>
            ${showPrice ? `<div class="price">Rs. ${row.sellPrice}</div>` : ""}
          </div>`,
        );
      })
      .join("");

    const html = `
    <html>
    <head>
      <title>Barcode Labels</title>
      <style>
        @page { margin: 5mm; }
        body { margin: 0; font-family: Arial, sans-serif; }
        .sheet { display: flex; flex-wrap: wrap; gap: 2mm; }
        .label {
          width: ${size.width};
          height: ${size.height};
          border: 1px dashed #ccc;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-sizing: border-box;
          padding: 1mm;
        }
        .item-name {
          font-size: ${size.fontSize};
          font-weight: bold;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .barcode-img { max-width: 95%; height: ${size.barHeight}px; }
        .barcode-text { font-size: ${size.fontSize}; }
        .price { font-size: ${size.fontSize}; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="sheet">${labelsHtml}</div>
    </body>
    </html>`;

    // Blob URL pattern - FillReceipt.jsx wale print flow jaisa (document.write
    // unreliable nikla tha, content render hone se pehle print trigger ho jata tha)
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) {
      alert("Print window block ho gayi. Popup allow karein.");
      URL.revokeObjectURL(url);
      return;
    }
    w.addEventListener("load", () => {
      w.focus();
      w.print();
    });
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Barcode Printing
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ position: "relative", mb: 2 }}>
          <Typography sx={{ fontSize: 12, mb: 0.5 }}>
            Item Name / Barcode
          </Typography>
          <TextField
            inputRef={nameRef}
            size="small"
            fullWidth
            sx={fieldSx}
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Item search karo..."
          />
          {searchResults.length > 0 && (
            <Paper
              sx={{
                position: "absolute",
                zIndex: 10,
                width: "100%",
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              <List dense>
                {searchResults.map((it) => (
                  <ListItemButton key={it._id} onClick={() => addItem(it)}>
                    <ListItemText
                      primary={it.itemName}
                      secondary={`Barcode: ${it.barcode || "NOT SET"} | Rs ${it.sellPrice}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            select
            label="Label Size"
            size="small"
            value={labelSize}
            onChange={(e) => setLabelSize(e.target.value)}
            sx={{ ...fieldSx, width: 240 }}
          >
            {LABEL_SIZES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Price dikhayein?"
            size="small"
            value={showPrice ? "yes" : "no"}
            onChange={(e) => setShowPrice(e.target.value === "yes")}
            sx={{ ...fieldSx, width: 160 }}
          >
            <MenuItem value="yes">Haan</MenuItem>
            <MenuItem value="no">Nahi</MenuItem>
          </TextField>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#e0e0e0" }}>
              <TableCell sx={cellSx}>Item</TableCell>
              <TableCell sx={cellSx}>Barcode</TableCell>
              <TableCell sx={cellSx}>Price</TableCell>
              <TableCell sx={cellSx}>Qty (kitne labels)</TableCell>
              <TableCell sx={cellSx}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {printList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={cellSx}>
                  Koi item add nahi hua
                </TableCell>
              </TableRow>
            ) : (
              printList.map((row, idx) => (
                <TableRow key={row.item}>
                  <TableCell sx={cellSx}>{row.itemName}</TableCell>
                  <TableCell sx={cellSx}>{row.barcode}</TableCell>
                  <TableCell sx={cellSx}>Rs {row.sellPrice}</TableCell>
                  <TableCell sx={cellSx}>
                    <TextField
                      size="small"
                      type="number"
                      sx={{ ...fieldSx, width: 80 }}
                      value={row.qty}
                      onChange={(e) => updateQty(idx, e.target.value)}
                      inputProps={{ min: 1 }}
                    />
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
              ))
            )}
          </TableBody>
        </Table>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 2,
          }}
        >
          <Typography sx={{ fontSize: 13 }}>
            Total labels: {totalLabels}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Print />}
            onClick={printLabels}
            disabled={printList.length === 0}
          >
            Print Labels
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
