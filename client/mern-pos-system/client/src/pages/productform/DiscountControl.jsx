import { useState } from "react";
import { Box, Select, MenuItem, TextField, Typography } from "@mui/material";

/**
 * MUI-based discount input — item-wise ya bill-wise dono jagah use hota hey.
 * FillReceipt.jsx ke fieldSx/cellSx design ke sath consistent rakha hey.
 *
 * Props:
 *  - baseAmount: number       (jis amount pe discount % calculate hoga)
 *  - value: { type: "percent" | "amount", value: number }
 *  - onChange: (newDiscountObj) => void
 *  - maxDiscountPercent: number  (Settings se, e.g. 20)
 *  - size: "sm" | "md"  (cart row ke liye "sm", totals panel/dialog ke liye "md")
 */
export default function DiscountControl({
  baseAmount = 0,
  value = { type: "percent", value: 0 },
  onChange,
  maxDiscountPercent = 100,
  size = "sm",
}) {
  const [error, setError] = useState("");

  const handleTypeChange = (e) => {
    onChange({ ...value, type: e.target.value });
    setError("");
  };

  const handleValueChange = (e) => {
    const num = Number(e.target.value) || 0;

    if (value.type === "percent" && num > maxDiscountPercent) {
      setError(`Max ${maxDiscountPercent}%`);
      onChange({ ...value, value: maxDiscountPercent });
      return;
    }
    if (value.type === "amount" && num > baseAmount) {
      setError("Amount se zyada nahi");
      onChange({ ...value, value: baseAmount });
      return;
    }
    setError("");
    onChange({ ...value, value: num });
  };

  const inputWidth = size === "sm" ? 55 : 80;

  return (
    <Box sx={{ display: "inline-flex", flexDirection: "column", gap: 0.3 }}>
      <Box sx={{ display: "inline-flex", gap: 0.5 }}>
        <Select
          size="small"
          value={value.type}
          onChange={handleTypeChange}
          sx={{
            minWidth: 52,
            fontSize: 12,
            "& .MuiSelect-select": { py: 0.5, px: 1 },
          }}
        >
          <MenuItem value="percent" sx={{ fontSize: 12 }}>
            %
          </MenuItem>
          <MenuItem value="amount" sx={{ fontSize: 12 }}>
            Rs
          </MenuItem>
        </Select>
        <TextField
          size="small"
          type="number"
          value={value.value || ""}
          onChange={handleValueChange}
          inputProps={{
            min: 0,
            style: { fontSize: 12, padding: "4px 6px", width: inputWidth },
          }}
        />
      </Box>
      {error && (
        <Typography sx={{ fontSize: 10, color: "#c62828", lineHeight: 1.2 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Helper — kisi bhi base amount pe discount object apply karke final amount deta hey.
 */
export function applyDiscount(baseAmount, discount) {
  if (!discount || !discount.value) return baseAmount;
  if (discount.type === "percent") {
    return baseAmount - (baseAmount * discount.value) / 100;
  }
  return Math.max(0, baseAmount - discount.value);
}
