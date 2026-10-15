import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import ProductForm from "./ProductForm";

const CATEGORIES = [
  "All",
  "General",
  "Grocery",
  "Electronics",
  "Clothing",
  "Other",
];

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/products", {
        params: { search, category, page, limit: 20 },
      });
      setProducts(res.data.products);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error("Products fetch nahi ho sake:", err);
    } finally {
      setLoading(false);
    }
  }, [search, category, page]);

  // Search type karte hi debounce ke sath fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchProducts();
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleDelete = async (product) => {
    if (!window.confirm(`"${product.name}" delete karna hey?`)) return;
    try {
      await axios.delete(`/api/products/${product._id}`);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || "Delete nahi ho saka");
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingProduct(null);
    fetchProducts();
  };

  if (showForm) {
    return (
      <div className="p-6">
        <ProductForm
          existingProduct={editingProduct}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-800">Products</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium"
        >
          + Naya Product
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, barcode ya SKU se search karein..."
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="border rounded px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Retail</th>
              <th className="px-4 py-2">Wholesale</th>
              <th className="px-4 py-2">Special</th>
              <th className="px-4 py-2">Barcode</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Load ho raha hey...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Koi product nahi mila
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p._id} className="border-t">
                  <td className="px-4 py-2 font-medium text-gray-800">
                    {p.name}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{p.category}</td>
                  <td className="px-4 py-2">{p.priceTiers?.retail}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {p.priceTiers?.wholesale ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {p.priceTiers?.special ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-gray-500 font-mono text-xs">
                    {p.barcode || "-"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={p.stock <= 5 ? "text-red-600 font-medium" : ""}
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleEdit(p)}
                      className="text-blue-600 text-xs font-medium mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="text-red-600 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="border px-3 py-1 rounded text-sm disabled:opacity-40"
          >
            Peechay
          </button>
          <span className="text-sm text-gray-600 px-2 py-1">
            Page {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="border px-3 py-1 rounded text-sm disabled:opacity-40"
          >
            Aagay
          </button>
        </div>
      )}
    </div>
  );
}
