import { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  MenuItem,
  IconButton,
  Collapse,
  Grid,
  Paper,
  InputAdornment,
  Chip,
  Button,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { fieldSx, COLORS } from "../layouts/PosLayout";

const STOCK_OPTIONS = [
  { value: "", label: "All Stock" },
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

export default function ItemSearchBar({
  onItemFound, // called when F1 barcode gives exact match (adds to cart)
  onResults, // called with items[] for name search / advanced filter results
  categories = [],
  manufacturers = [],
}) {
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    manufacturer: "",
    minPrice: "",
    maxPrice: "",
    stockStatus: "",
  });

  const barcodeRef = useRef(null);
  const debounceRef = useRef(null);

  // F1 - barcode field always focused for scanner gun input
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // F1 - exact match search (scanner hits Enter automatically)
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    try {
      const { data } = await axios.get(
        `/api/items/search-barcode/${barcode.trim()}`,
      );
      if (data.success) {
        onItemFound?.(data.item);
      }
    } catch (error) {
      console.error("Barcode search failed:", error);
    } finally {
      setBarcode("");
      barcodeRef.current?.focus();
    }
  };

  // F2 - live search as you type
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!name.trim()) {
      onResults?.([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get("/api/items/search-name", {
          params: { q: name },
        });
        if (data.success) onResults?.(data.items);
      } catch (error) {
        console.error("Name search failed:", error);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [name]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleFilterChange = (field) => (e) =>
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  const runAdvancedSearch = async () => {
    try {
      const { data } = await axios.get("/api/items/search", {
        params: { q: name, ...filters },
      });
      if (data.success) onResults?.(data.items);
    } catch (error) {
      console.error("Advanced search failed:", error);
    }
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      manufacturer: "",
      minPrice: "",
      maxPrice: "",
      stockStatus: "",
    });
  };

  useEffect(() => {
    if (activeFilterCount > 0) runAdvancedSearch();
  }, [filters]);

  return (
    <Paper
      elevation={0}
      sx={{ p: 1.5, mb: 1.5, border: `1px solid ${COLORS.border}` }}
    >
      {/* Quick fields row - always visible */}
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
        <form onSubmit={handleBarcodeSubmit} style={{ flex: "0 0 220px" }}>
          <TextField
            inputRef={barcodeRef}
            fullWidth
            size="small"
            placeholder="F1 - Scan Barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <QrCodeScannerIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </form>

        <TextField
          fullWidth
          size="small"
          placeholder="F2 - Search Item Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={fieldSx}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <IconButton
          onClick={() => setAdvancedOpen((prev) => !prev)}
          sx={{
            border: `1px solid ${COLORS.border}`,
            borderRadius: 1.5,
            bgcolor: advancedOpen ? COLORS.primary + "15" : "transparent",
          }}
        >
          <TuneIcon
            fontSize="small"
            color={advancedOpen ? "primary" : "inherit"}
          />
        </IconButton>

        {activeFilterCount > 0 && (
          <Chip
            label={`${activeFilterCount} Filters`}
            size="small"
            onDelete={clearFilters}
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      {/* Advanced filters - collapsible */}
      <Collapse in={advancedOpen}>
        <Box
          sx={{ mt: 1.5, pt: 1.5, borderTop: `1px dashed ${COLORS.border}` }}
        >
          <Grid container spacing={1.5}>
            <Grid item xs={6} sm={2.4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Category"
                value={filters.category}
                onChange={handleFilterChange("category")}
                sx={fieldSx}
              >
                <MenuItem value="">All</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6} sm={2.4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Manufacturer"
                value={filters.manufacturer}
                onChange={handleFilterChange("manufacturer")}
                sx={fieldSx}
              >
                <MenuItem value="">All</MenuItem>
                {manufacturers.map((m) => (
                  <MenuItem key={m._id} value={m._id}>
                    {m.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6} sm={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Min Price"
                value={filters.minPrice}
                onChange={handleFilterChange("minPrice")}
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={6} sm={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Max Price"
                value={filters.maxPrice}
                onChange={handleFilterChange("maxPrice")}
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={8} sm={2.2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Stock Status"
                value={filters.stockStatus}
                onChange={handleFilterChange("stockStatus")}
                sx={fieldSx}
              >
                {STOCK_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={4} sm={1}>
              <IconButton onClick={clearFilters} sx={{ mt: 0.5 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
}
