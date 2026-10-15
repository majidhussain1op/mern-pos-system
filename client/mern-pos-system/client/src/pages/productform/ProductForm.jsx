import { useState, useEffect } from "react";
import axios from "axios"; // apna configured axios instance use karna agar hey (e.g. api.js)

const CATEGORIES = ["General", "Grocery", "Electronics", "Clothing", "Other"]; // apni actual list daal dena

const initialForm = {
  name: "",
  category: "General",
  priceTiers: { retail: "", wholesale: "", special: "" },
  barcode: "",
  stock: 0,
  sku: "",
  description: "",
};

export default function ProductForm({ existingProduct, onSuccess, onCancel }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [barcodeChecking, setBarcodeChecking] = useState(false);
  const [barcodeTaken, setBarcodeTaken] = useState(false);

  const isEdit = Boolean(existingProduct);

  // Edit mode ho to form pre-fill karo
  useEffect(() => {
    if (existingProduct) {
      setForm({
        name: existingProduct.name || "",
        category: existingProduct.category || "General",
        priceTiers: {
          retail: existingProduct.priceTiers?.retail ?? "",
          wholesale: existingProduct.priceTiers?.wholesale ?? "",
          special: existingProduct.priceTiers?.special ?? "",
        },
        barcode: existingProduct.barcode || "",
        stock: existingProduct.stock ?? 0,
        sku: existingProduct.sku || "",
        description: existingProduct.description || "",
      });
    }
  }, [existingProduct]);

  // Barcode type karte hi duplicate check (debounce ke sath)
  useEffect(() => {
    if (!form.barcode || form.barcode.length < 3) {
      setBarcodeTaken(false);
      return;
    }
    const timer = setTimeout(async () => {
      setBarcodeChecking(true);
      try {
        const res = await axios.get(`/api/products/barcode/${form.barcode}`);
        // Agar product mil gaya aur wo edit mode mein current product nahi hey to taken hey
        if (res.data && res.data._id !== existingProduct?._id) {
          setBarcodeTaken(true);
        } else {
          setBarcodeTaken(false);
        }
      } catch (err) {
        // 404 matlab barcode free hey - normal case
        setBarcodeTaken(false);
      } finally {
        setBarcodeChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.barcode, existingProduct]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePriceTierChange = (tier, value) => {
    setForm((prev) => ({
      ...prev,
      priceTiers: { ...prev.priceTiers, [tier]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Product name zaroori hey");
      return;
    }
    if (!form.priceTiers.retail || Number(form.priceTiers.retail) <= 0) {
      setError("Retail price zaroori hey aur 0 se zyada hona chahiye");
      return;
    }
    if (barcodeTaken) {
      setError("Ye barcode pehle se kisi aur product mein use ho raha hey");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        priceTiers: {
          retail: Number(form.priceTiers.retail),
          wholesale: form.priceTiers.wholesale
            ? Number(form.priceTiers.wholesale)
            : null,
          special: form.priceTiers.special
            ? Number(form.priceTiers.special)
            : null,
        },
        stock: Number(form.stock),
        barcode: form.barcode.trim() || undefined,
      };

      let res;
      if (isEdit) {
        res = await axios.put(`/api/products/${existingProduct._id}`, payload);
      } else {
        res = await axios.post("/api/products", payload);
      }

      onSuccess?.(res.data);
      if (!isEdit) setForm(initialForm);
    } catch (err) {
      setError(err.response?.data?.message || "Kuch ghalat ho gaya");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow p-6 space-y-4 max-w-xl"
    >
      <h2 className="text-lg font-semibold text-gray-800">
        {isEdit ? "Product Edit Karein" : "Naya Product Add Karein"}
      </h2>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">
          {error}
        </div>
      )}

      {/* Name + Category */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Name *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g. Lays Chips 50g"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={form.category}
            onChange={(e) => handleChange("category", e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Price Tiers */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Price Tiers
        </label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Retail *</label>
            <input
              type="number"
              value={form.priceTiers.retail}
              onChange={(e) => handlePriceTierChange("retail", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Wholesale
            </label>
            <input
              type="number"
              value={form.priceTiers.wholesale}
              onChange={(e) =>
                handlePriceTierChange("wholesale", e.target.value)
              }
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Optional"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Special</label>
            <input
              type="number"
              value={form.priceTiers.special}
              onChange={(e) => handlePriceTierChange("special", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Optional"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Barcode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Barcode
        </label>
        <input
          type="text"
          value={form.barcode}
          onChange={(e) => handleChange("barcode", e.target.value)}
          className={`w-full border rounded px-3 py-2 text-sm ${barcodeTaken ? "border-red-400" : ""}`}
          placeholder="Scan ya type karein"
        />
        {barcodeChecking && (
          <p className="text-xs text-gray-400 mt-1">Check ho raha hey...</p>
        )}
        {barcodeTaken && (
          <p className="text-xs text-red-600 mt-1">
            Ye barcode already use ho raha hey
          </p>
        )}
      </div>

      {/* Stock + SKU */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stock
          </label>
          <input
            type="number"
            value={form.stock}
            onChange={(e) => handleChange("stock", e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SKU
          </label>
          <input
            type="text"
            value={form.sku}
            onChange={(e) => handleChange("sku", e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
          rows={2}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || barcodeTaken}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {loading
            ? "Save ho raha hey..."
            : isEdit
              ? "Update Karein"
              : "Product Add Karein"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="border px-4 py-2 rounded text-sm text-gray-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
