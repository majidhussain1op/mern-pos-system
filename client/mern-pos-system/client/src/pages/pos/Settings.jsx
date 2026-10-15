import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
} from "@mui/material";
import PosLayout, { fieldSx } from "./PosLayout";
import api from "../../services/api";

export default function Settings() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/settings").then(({ data }) => setForm(data.settings));
  }, []);

  const submit = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/settings", form);
      setForm(data.settings);
      alert("Settings saved");
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  return (
    <PosLayout>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 500 }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>Shop Settings</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Shop Name"
            size="small"
            sx={fieldSx}
            value={form.shopName}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
          />
          <TextField
            label="Address"
            size="small"
            sx={fieldSx}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <TextField
            label="Phone"
            size="small"
            sx={fieldSx}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <TextField
            label="Currency"
            size="small"
            sx={fieldSx}
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
          <TextField
            label="Invoice Prefix"
            size="small"
            sx={fieldSx}
            value={form.invoicePrefix}
            onChange={(e) =>
              setForm({ ...form, invoicePrefix: e.target.value })
            }
          />
          <TextField
            label="Default Low Stock Threshold"
            type="number"
            size="small"
            sx={fieldSx}
            value={form.lowStockThresholdDefault}
            onChange={(e) =>
              setForm({ ...form, lowStockThresholdDefault: e.target.value })
            }
          />

          <Divider sx={{ my: 1 }} />
          <Typography sx={{ fontWeight: 700 }}>Discount Rules</Typography>

          <TextField
            label="Max Discount Percent"
            type="number"
            size="small"
            sx={fieldSx}
            value={form.maxDiscountPercent}
            onChange={(e) =>
              setForm({ ...form, maxDiscountPercent: e.target.value })
            }
            helperText="Fill Receipt mein item/bill discount is se zyada apply nahi ho sakega"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.allowItemWiseDiscount ?? true}
                onChange={(e) =>
                  setForm({ ...form, allowItemWiseDiscount: e.target.checked })
                }
              />
            }
            label="Item-wise discount allow karo"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.allowBillWiseDiscount ?? true}
                onChange={(e) =>
                  setForm({ ...form, allowBillWiseDiscount: e.target.checked })
                }
              />
            }
            label="Bill-wise discount allow karo"
          />

          <Divider sx={{ my: 1 }} />
          <Typography sx={{ fontWeight: 700 }}>GST / Tax Rules</Typography>

          <FormControlLabel
            control={
              <Switch
                checked={form.gstEnabled ?? true}
                onChange={(e) =>
                  setForm({ ...form, gstEnabled: e.target.checked })
                }
              />
            }
            label="GST enable karo"
          />
          <TextField
            label="Default GST Rate %"
            type="number"
            size="small"
            sx={fieldSx}
            value={form.defaultGstRate}
            onChange={(e) =>
              setForm({ ...form, defaultGstRate: e.target.value })
            }
            disabled={!form.gstEnabled}
            helperText="Jis item pe apna GST rate set na ho, uske liye ye default use hoga"
          />
          <TextField
            label="Additional GST Rate % (Further Tax)"
            type="number"
            size="small"
            sx={fieldSx}
            value={form.additionalGstRate}
            onChange={(e) =>
              setForm({ ...form, additionalGstRate: e.target.value })
            }
            disabled={!form.gstEnabled}
            helperText="Ye har sale pe automatically goods value ke upar lagta hai"
          />

          <Divider sx={{ my: 1 }} />
          <Typography sx={{ fontWeight: 700 }}>Barcode Rule</Typography>

          <FormControlLabel
            control={
              <Switch
                checked={form.barcodeRequired ?? false}
                onChange={(e) =>
                  setForm({ ...form, barcodeRequired: e.target.checked })
                }
              />
            }
            label="Item add/edit karte waqt barcode zaroori ho"
          />

          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </Box>
      </Paper>
    </PosLayout>
  );
}
