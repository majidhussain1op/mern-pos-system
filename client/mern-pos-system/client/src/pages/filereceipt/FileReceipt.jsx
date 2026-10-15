import { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  Menu,
  Button,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  InputAdornment,
  Collapse,
  Grid,
  Chip,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  Search,
  Add,
  Delete,
  Print,
  Logout,
  QrCodeScanner,
  Tune,
  Close,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import { openCashDrawer as openCashDrawerViaQZ } from "../../services/qzPrinter";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import DiscountControl, { applyDiscount } from "../productform/DiscountControl";

import axios from "axios";

const COLORS = {
  header: "linear-gradient(90deg,#b3184f 0%,#d81b60 100%)",
  toolbar: "#a3e4e4",
  panelBg: "#f4f4f4",
  border: "#9e9e9e",
  selectedRow: "#29b6f6",
  totalBox: "#7a1f1f",
  totalBox2: "#c77a1f",
  primary: "#1565c0",
};

const cellSx = {
  border: `1px solid ${COLORS.border}`,
  py: 0.5,
  px: 1,
  fontSize: 13,
};
const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: 0, background: "#fff" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: COLORS.border },
};

const STOCK_OPTIONS = [
  { value: "", label: "All Stock" },
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

const TENDER_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "BANK", label: "Bank Transfer" },
];

const FLAT_DISCOUNT_PER_ITEM = 5;

const NO_DISCOUNT = { type: "percent", value: 0 };

const computeRowTotals = (sellPrice, qty, discount = NO_DISCOUNT) => {
  const gross = qty * sellPrice;
  const flatDiscountTotal = qty * FLAT_DISCOUNT_PER_ITEM;
  const afterFlat = Math.max(gross - flatDiscountTotal, 0);

  const discountValue = Number(discount?.value) || 0;
  const extraDiscount =
    discount?.type === "amount"
      ? discountValue
      : (afterFlat * discountValue) / 100;

  const lineTotal = Math.max(afterFlat - extraDiscount, 0);
  const totalDiscount = gross - lineTotal;
  const finalUnitPrice = qty > 0 ? lineTotal / qty : 0;
  return { lineTotal, totalDiscount, finalUnitPrice };
};

const SHOP_INFO = {
  name: "Your Shop Name",
  address: "Shop Address, City",
  phone: "0300-0000000",
};

const TOOLBAR_ROUTES = [
  { label: "Home", path: "/dashboard" },
  { label: "Items", path: "/items" },
  { label: "Purchase", path: "/purchase" },
  {
    label: "Sales",
    path: "/fill-receipt",
    dropdown: [
      { label: "Fill Receipt", path: "/fill-receipt" },
      { label: "Sales History", path: "/sales-history" },
      { label: "Shift", path: "/pos/shift" },
      { label: "Cash In/Out History", path: "/pos/cash-movements" },
      { label: "Best Selling Items", path: "/pos/reports/top-selling" },
      { label: "Sales Report", path: "/pos/reports/sales" },
      { label: "Stock Report", path: "/pos/reports/stock" },
      { label: "Customer Ledger", path: "/pos/reports/customer-ledger" },
      { label: "Expiry Report", path: "/pos/reports/expiry" },
      { label: "Purchase Orders", path: "/pos/purchase-orders" },
      { label: "Purchase Return", path: "/pos/purchase-returns" },
      { label: "Trial Balance", path: "/pos/inventory/trial-balance" },
      { label: "Journal Entries", path: "/pos/inventory/journal" },
      { label: "Voucher Entry", path: "/pos/inventory/voucher-entry" },
      { label: "Chart of Accounts", path: "/pos/inventory/chart-of-accounts" },
      { label: "Cash Flow Statement", path: "/pos/inventory/cash-flow" },
      {
        label: "Date Wise Receipt/Payment",
        path: "/pos/inventory/date-wise-receipt-payment",
      },
      {
        label: "Supplier Payment Summary",
        path: "/pos/inventory/supplier-payment-summary",
      },
      {
        label: "Budget vs Expenses",
        path: "/pos/inventory/budget-vs-expenses",
      },
      {
        label: "Consolidated Ledger",
        path: "/pos/inventory/consolidated-ledger",
      },
      { label: "Income Statement", path: "/pos/inventory/income-statement" },
      { label: "Balance Sheet", path: "/pos/inventory/balance-sheet" },
      {
        label: "Categories & Suppliers",
        path: "/pos/inventory/categories-suppliers",
      },
    ],
  },
  { label: "Customers", path: "/customers" },
  { label: "Stock", path: "/stock" },
  { label: "Receive", path: "/receive" },
  { label: "Payment", path: "/payment" },
  { label: "Journal", path: "/journal" },
  { label: "Reports", path: "/reports" },
  { label: "Settings", path: "/settings" },
  { label: "Barcode Printing", path: "/barcode-print" },
  { label: "AI Assistant", path: "/ai-assistant" },
];

const SUB_TABS = [
  { label: "Fill Receipt", path: "/fill-receipt" },
  { label: "Sales History", path: "/sales-history" },
  { label: "Reports", path: "/reports" },
  { label: "Settings", path: "/settings" },
];

export default function FillReceipt() {
  const navigate = useNavigate();
  const location = useLocation();

  const [toolbarAnchorEl, setToolbarAnchorEl] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState(100);

  // naya: GST config Settings se
  const [gstEnabled, setGstEnabled] = useState(true);
  const [defaultGstRate, setDefaultGstRate] = useState(0);
  const [additionalGstRate, setAdditionalGstRate] = useState(0);

  useEffect(() => {
    axios.get("/api/settings").then((res) => {
      const s = res.data.settings || {};
      setMaxDiscountPercent(s.maxDiscountPercent ?? 100);
      setGstEnabled(s.gstEnabled ?? true);
      setDefaultGstRate(s.defaultGstRate ?? 0);
      setAdditionalGstRate(s.additionalGstRate ?? 0);
    });
  }, []);

  const handleToolbarClick = (event, item) => {
    if (item.dropdown) {
      setToolbarAnchorEl(event.currentTarget);
      setActiveDropdown(item.label);
    } else {
      navigate(item.path);
    }
  };

  const handleToolbarDropdownClose = () => {
    setToolbarAnchorEl(null);
    setActiveDropdown(null);
  };

  const handleToolbarDropdownSelect = (path) => {
    navigate(path);
    handleToolbarDropdownClose();
  };

  const [customerName, setCustomerName] = useState("COUNTER");
  const [customerId, setCustomerId] = useState(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [stockInHand, setStockInHand] = useState(0);
  const { logout } = useContext(AuthContext);

  const [barcode, setBarcode] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [filters, setFilters] = useState({
    category: "",
    manufacturer: "",
    minPrice: "",
    maxPrice: "",
    stockStatus: "",
  });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const [itemDiscount, setItemDiscount] = useState(NO_DISCOUNT);
  const [isFOC, setIsFOC] = useState(false); // naya - manual add row ke liye

  const [cart, setCart] = useState([]);
  const [billDiscount, setBillDiscount] = useState(NO_DISCOUNT);
  const [receivable, setReceivable] = useState(0);
  const [biltiNo, setBiltiNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentType, setPaymentType] = useState("CASH");

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [openingDrawer, setOpeningDrawer] = useState(false);

  const [tenders, setTenders] = useState([
    { id: 1, method: "CASH", amount: "" },
  ]);

  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState([]);

  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [addingCustomer, setAddingCustomer] = useState(false);

  const [heldBills, setHeldBills] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("heldBills") || "[]");
    } catch {
      return [];
    }
  });
  const [recallOpen, setRecallOpen] = useState(false);

  const [printChoiceOpen, setPrintChoiceOpen] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [lastCart, setLastCart] = useState([]);

  const barcodeRef = useRef(null);

  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [catRes, manRes] = await Promise.all([
          api.get("/categories"),
          api.get("/manufacturers"),
        ]);
        setCategories(catRes.data.categories || catRes.data.data || []);
        setManufacturers(manRes.data.manufacturers || manRes.data.data || []);
      } catch (err) {
        console.error("Filter data fetch failed:", err);
      }
    };
    fetchFilterData();
  }, []);

  useEffect(() => {
    if (!nameQuery.trim() && activeFilterCount === 0) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      try {
        if (activeFilterCount > 0) {
          const { data } = await api.get("/items/search", {
            params: { q: nameQuery, ...filters },
          });
          setSearchResults(data.items);
        } else {
          const { data } = await api.get(`/items/search-name?q=${nameQuery}`);
          setSearchResults(data.items);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [nameQuery, filters, activeFilterCount]);

  const handleFilterChange = (field) => (e) =>
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));

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
    if (!customerSearchOpen) return;
    const delay = setTimeout(async () => {
      try {
        const { data } = await api.get(
          `/customers/search?q=${customerSearchText}`,
        );
        setCustomerSearchResults(data.customers);
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [customerSearchText, customerSearchOpen]);

  useEffect(() => {
    localStorage.setItem("heldBills", JSON.stringify(heldBills));
  }, [heldBills]);

  // naya: qty * sellPrice * gstRate / 100 - FOC lines ke liye original value pe GST
  const computeFocGst = (row) => {
    const rate = row.gstRate ?? defaultGstRate;
    return gstEnabled ? (row.qty * row.sellPrice * rate) / 100 : 0;
  };

  const addItemToCartDirect = (item, quantity = 1) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((r) => r.item === item._id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        const row = updated[existingIdx];
        const newQty = row.qty + quantity;
        const { lineTotal } = computeRowTotals(
          row.sellPrice,
          newQty,
          row.discount,
        );
        updated[existingIdx] = { ...row, qty: newQty, lineTotal };
        return updated;
      }

      const { lineTotal } = computeRowTotals(
        item.sellPrice,
        quantity,
        NO_DISCOUNT,
      );
      return [
        ...prev,
        {
          item: item._id,
          barcode: item.barcode,
          itemName: item.itemName,
          urduName: item.urduName || "",
          qty: quantity,
          sellPrice: item.sellPrice,
          discount: { ...NO_DISCOUNT },
          isFOC: false, // naya
          gstRate: item.gstRate ?? null, // naya - item ka apna rate, null = default use hoga
          lineTotal,
        },
      ];
    });

    setStockInHand(item.stockQty);
  };

  const searchBarcode = async () => {
    if (!barcode.trim()) return;
    try {
      const { data } = await api.get(`/items/search-barcode/${barcode}`);
      addItemToCartDirect(data.item, 1);
      setBarcode("");
      barcodeRef.current?.focus();
    } catch {
      alert("Item not found for this barcode");
      setBarcode("");
      barcodeRef.current?.focus();
    }
  };

  const handleBarcodeEnter = (e) => {
    if (e.key !== "Enter") return;
    searchBarcode();
  };

  const pickItem = (item) => {
    setSelectedItem(item);
    setPrice(item.sellPrice);
    setStockInHand(item.stockQty);
    setSearchResults([]);
    setNameQuery(item.itemName);
    setBarcode(item.barcode);
  };

  const addToCart = () => {
    if (!selectedItem) return alert("Pehle item select karo (F1/F2)");
    if (!qty || qty <= 0) return alert("Qty valid honi chahiye");

    const { lineTotal } = computeRowTotals(
      Number(price),
      Number(qty),
      itemDiscount,
    );

    setCart((prev) => [
      ...prev,
      {
        item: selectedItem._id,
        barcode: selectedItem.barcode,
        itemName: selectedItem.itemName,
        urduName: selectedItem.urduName || "",
        qty: Number(qty),
        sellPrice: Number(price),
        discount: itemDiscount,
        isFOC, // naya
        gstRate: selectedItem.gstRate ?? null, // naya
        lineTotal,
      },
    ]);

    setSelectedItem(null);
    setBarcode("");
    setNameQuery("");
    setQty(1);
    setPrice("");
    setItemDiscount(NO_DISCOUNT);
    setIsFOC(false); // naya - reset
    barcodeRef.current?.focus();
  };

  const removeRow = (idx) =>
    setCart((prev) => prev.filter((_, i) => i !== idx));

  const updateRowDiscount = (idx, newDiscount) => {
    setCart((prev) => {
      const updated = [...prev];
      const row = updated[idx];
      const { lineTotal } = computeRowTotals(
        row.sellPrice,
        row.qty,
        newDiscount,
      );
      updated[idx] = { ...row, discount: newDiscount, lineTotal };
      return updated;
    });
  };

  // naya: FOC checkbox cart row mein directly toggle karne ke liye
  const updateRowFOC = (idx, checked) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], isFOC: checked };
      return updated;
    });
  };

  const selectCustomer = (cust) => {
    setCustomerId(cust._id);
    setCustomerName(cust.name);
    setPhone(cust.phone || "");
    setAddress(cust.address || "");
    setCustomerSearchOpen(false);
    setCustomerSearchText("");
    setCustomerSearchResults([]);
  };

  const submitNewCustomer = async () => {
    if (!newCustomer.name.trim()) return alert("Customer ka naam likho");
    setAddingCustomer(true);
    try {
      const { data } = await api.post("/customers", newCustomer);
      selectCustomer(data.customer);
      setAddCustomerOpen(false);
      setNewCustomer({ name: "", phone: "", address: "" });
    } catch (err) {
      alert(err.response?.data?.message || "Customer add nahi ho saka");
    } finally {
      setAddingCustomer(false);
    }
  };

  const holdBill = () => {
    if (cart.length === 0)
      return alert("Cart khali hai, hold karne ko kuch nahi");
    const held = {
      id: Date.now(),
      customerId,
      customerName,
      phone,
      address,
      cart,
      billDiscount,
      biltiNo,
      remarks,
      heldAt: new Date().toLocaleString(),
    };
    setHeldBills((prev) => [held, ...prev]);
    setCart([]);
    setBillDiscount(NO_DISCOUNT);
    setReceivable(0);
    setBiltiNo("");
    setRemarks("");
  };

  const recallBill = (held) => {
    setCustomerId(held.customerId);
    setCustomerName(held.customerName);
    setPhone(held.phone);
    setAddress(held.address);
    setCart(held.cart);
    setBillDiscount(held.billDiscount || NO_DISCOUNT);
    setBiltiNo(held.biltiNo);
    setRemarks(held.remarks);
    setHeldBills((prev) => prev.filter((h) => h.id !== held.id));
    setRecallOpen(false);
  };

  const totalQty = cart.reduce((s, r) => s + r.qty, 0);
  const totalItems = cart.length;

  // fix: FOC rows ka lineTotal customer se charge nahi hota, isliye subTotalBill
  // mein FOC rows ka contribution 0 maana jata hai (backend jo forcefully karta hai,
  // wahi preview yahan bhi dikhana zaroori hai taake Net Total match ho)
  const subTotalBill = cart.reduce(
    (s, r) => s + (r.isFOC ? 0 : r.lineTotal),
    0,
  );
  const netTotal = applyDiscount(subTotalBill, billDiscount);
  const grossTotalWithoutDiscount = cart.reduce(
    (s, r) => s + r.qty * r.sellPrice,
    0,
  );

  // naya: GST estimate (preview ke liye) - asal authoritative numbers backend
  // se hi aayenge (data.sale.totalGstAmount waghera), ye sirf UI preview hai
  const totalGstEstimate = gstEnabled
    ? cart.reduce((sum, r) => {
        if (r.isFOC) return sum;
        const rate = r.gstRate ?? defaultGstRate;
        return sum + (r.lineTotal * rate) / 100;
      }, 0)
    : 0;
  const focGstEstimate = gstEnabled
    ? cart.reduce((sum, r) => (r.isFOC ? sum + computeFocGst(r) : sum), 0)
    : 0;
  const additionalGstEstimate = gstEnabled
    ? (netTotal * additionalGstRate) / 100
    : 0;
  const grandTotalEstimate =
    netTotal + totalGstEstimate + additionalGstEstimate;

  const addTenderRow = () =>
    setTenders((prev) => [
      ...prev,
      { id: Date.now(), method: "CASH", amount: "" },
    ]);
  const removeTenderRow = (id) =>
    setTenders((prev) => prev.filter((t) => t.id !== id));
  const updateTenderRow = (id, field, value) =>
    setTenders((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );

  const totalTendered = tenders.reduce(
    (s, t) => s + (Number(t.amount) || 0),
    0,
  );
  // fix: udhar/change ab grandTotalEstimate (tax-inclusive) se calculate hota hai, netTotal (tax-exclusive) se nahi
  const balanceRemaining = Math.max(grandTotalEstimate - totalTendered, 0);
  const changeDue = Math.max(totalTendered - grandTotalEstimate, 0);

  const handleLogout = () => {
    const confirmed = window.confirm("Will you want to logout?");
    if (!confirmed) return;
    logout();
    navigate("/");
  };

  const saveReceipt = async () => {
    if (cart.length === 0) return alert("Cart khali hai");
    setSaving(true);
    try {
      const payload = {
        customer: customerId || null,
        items: cart.map(({ item, qty, sellPrice, discount, isFOC }) => ({
          item,
          qty,
          sellPrice,
          lessPercent:
            discount?.type === "percent" ? Number(discount.value) || 0 : 0,
          lessAmount:
            discount?.type === "amount" ? Number(discount.value) || 0 : 0,
          isFOC: Boolean(isFOC), // naya
        })),
        lessPercent:
          billDiscount.type === "percent" ? Number(billDiscount.value) || 0 : 0,
        lessAmount:
          billDiscount.type === "amount" ? Number(billDiscount.value) || 0 : 0,
        payments: tenders
          .filter((t) => Number(t.amount) > 0)
          .map((t) => ({ method: t.method, amount: Number(t.amount) })),
        paymentType: tenders[0]?.method || paymentType,
        receivedAmount: Math.min(totalTendered, grandTotalEstimate), // fix: grandTotal (tax-inclusive) ke against
        receivable: balanceRemaining,
        changeDue,
        biltiNo,
        remarks,
      };
      const { data } = await api.post("/sales", payload);

      setLastSale({ ...data.sale, customerName, phone, address });
      setLastCart(cart);
      setPrintChoiceOpen(true);

      setCart([]);
      setBillDiscount(NO_DISCOUNT);
      setReceivable(0);
      setBiltiNo("");
      setRemarks("");
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openCashDrawer = async () => {
    try {
      setOpeningDrawer(true);
      await openCashDrawerViaQZ();
    } catch (err) {
      console.error("Cash drawer open failed:", err);
      alert(err.message || "Cash drawer nahi khul saka. QZ Tray check karein.");
    } finally {
      setOpeningDrawer(false);
    }
  };

  const confirmPaymentAndSave = async () => {
    if (totalTendered <= 0) {
      alert("Kam se kam ek tender amount enter karein");
      return;
    }
    setPaymentDialogOpen(false);
    await saveReceipt();
    await openCashDrawer();
  };

  const buildReceiptRows = (items) =>
    items
      .map(
        (r) => `
        <tr>
          <td>${r.itemName}${r.isFOC ? " (FOC)" : ""}</td>
          <td style="text-align:center">${r.qty}</td>
          <td style="text-align:right">${r.isFOC ? "0.00" : r.sellPrice}</td>
          <td style="text-align:right">${r.lineTotal.toFixed(2)}</td>
        </tr>`,
      )
      .join("");

  const openPrintWindow = (html) => {
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head>${html.replace(/<html>|<\/html>|<head>[\s\S]*?<\/head>/g, "")}`;
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const w = window.open(url, "_blank");
    if (!w) {
      alert(
        "Print window block ho gayi. Browser ke address bar mein popup-blocked icon check karein aur is site ke liye popups allow karein.",
      );
      URL.revokeObjectURL(url);
      return;
    }

    w.addEventListener("load", () => {
      w.focus();
      w.print();
    });

    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const printThermal = () => {
    if (!lastSale) return;
    const html = `
    <html>
    <head>
      <title>Receipt</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 78mm; margin: 0 auto; padding: 4px; }
        h2 { text-align:center; margin: 4px 0; font-size: 14px; }
        p { margin: 2px 0; text-align:center; }
        table { width:100%; border-collapse: collapse; margin-top:6px; }
        td, th { font-size: 11px; padding: 2px 0; }
        hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
        .totals td { font-weight: bold; }
        .center { text-align:center; }
        .right { text-align:right; }
      </style>
    </head>
    <body>
      <h2>${SHOP_INFO.name}</h2>
      <p>${SHOP_INFO.address}</p>
      <p>${SHOP_INFO.phone}</p>
      <hr/>
      <p class="center">Invoice: ${lastSale.invoiceNo}</p>
      <p class="center">${new Date().toLocaleString()}</p>
      <p class="center">Customer: ${lastSale.customerName || "COUNTER"}</p>
      <hr/>
      <table>
        <tr><td>Item</td><td class="center">Qty</td><td class="right">Price</td><td class="right">Total</td></tr>
        ${buildReceiptRows(lastCart)}
      </table>
      <hr/>
      <table class="totals">
        <tr><td>Sub Total</td><td class="right">${lastSale.totalAmount?.toFixed(2)}</td></tr>
        ${lastSale.totalGstAmount > 0 ? `<tr><td>GST</td><td class="right">${lastSale.totalGstAmount?.toFixed(2)}</td></tr>` : ""}
        ${lastSale.additionalGstAmount > 0 ? `<tr><td>Additional GST</td><td class="right">${lastSale.additionalGstAmount?.toFixed(2)}</td></tr>` : ""}
        <tr><td>Grand Total</td><td class="right">${lastSale.grandTotal?.toFixed(2)}</td></tr>
        <tr><td>Received</td><td class="right">${lastSale.receivedAmount?.toFixed(2)}</td></tr>
        <tr><td>Receivable</td><td class="right">${lastSale.receivable?.toFixed(2)}</td></tr>
      </table>
      <hr/>
      <p>Thank you!</p>
    </body>
    </html>`;
    openPrintWindow(html);
    setPrintChoiceOpen(false);
  };

  const printLaser = () => {
    if (!lastSale) return;
    const html = `
    <html>
    <head>
      <title>Invoice</title>
      <style>
        @page { size: A5; margin: 15mm; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #222; }
        .header { display:flex; justify-content:space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
        .header h1 { margin:0; font-size: 20px; }
        table { width:100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; }
        th { background: #f0f0f0; text-align:left; }
        .right { text-align:right; }
        .totals { margin-top: 15px; width: 280px; margin-left: auto; }
        .totals td { border: none; padding: 3px 0; }
        .totals .grand { font-weight:bold; font-size:14px; border-top: 1px solid #333; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>${SHOP_INFO.name}</h1>
          <p>${SHOP_INFO.address}<br/>${SHOP_INFO.phone}</p>
        </div>
        <div style="text-align:right">
          <p><strong>Invoice:</strong> ${lastSale.invoiceNo}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Customer:</strong> ${lastSale.customerName || "COUNTER"}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
        </thead>
        <tbody>${buildReceiptRows(lastCart)}</tbody>
      </table>
      <table class="totals">
        <tr><td>Sub Total</td><td class="right">${lastSale.subTotal?.toFixed(2)}</td></tr>
        ${lastSale.totalGstAmount > 0 ? `<tr><td>GST</td><td class="right">${lastSale.totalGstAmount?.toFixed(2)}</td></tr>` : ""}
        ${lastSale.additionalGstAmount > 0 ? `<tr><td>Additional GST</td><td class="right">${lastSale.additionalGstAmount?.toFixed(2)}</td></tr>` : ""}
        <tr class="grand"><td>Grand Total</td><td class="right">${lastSale.grandTotal?.toFixed(2)}</td></tr>
        <tr><td>Received</td><td class="right">${lastSale.receivedAmount?.toFixed(2)}</td></tr>
        <tr><td>Receivable</td><td class="right">${lastSale.receivable?.toFixed(2)}</td></tr>
      </table>
    </body>
    </html>`;
    openPrintWindow(html);
    setPrintChoiceOpen(false);
  };

  return (
    <Box sx={{ bgcolor: COLORS.panelBg, minHeight: "100vh" }}>
      <Box
        sx={{
          background: COLORS.header,
          px: 3,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          onClick={() => navigate("/dashboard")}
          sx={{
            color: "#fff",
            fontWeight: 700,
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          Nexus POS
        </Typography>
        <Button
          onClick={handleLogout}
          startIcon={<Logout fontSize="small" />}
          sx={{
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.5)",
            borderRadius: 0,
            textTransform: "none",
            fontSize: 13,
            "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
          }}
        >
          Logout
        </Button>
      </Box>

      <Box
        sx={{
          bgcolor: COLORS.toolbar,
          borderBottom: `1px solid ${COLORS.border}`,
          px: 2,
          py: 0.5,
          display: "flex",
          gap: 3,
        }}
      >
        {TOOLBAR_ROUTES.map((t) => (
          <Typography
            key={t.label}
            onClick={(e) => handleToolbarClick(e, t)}
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: location.pathname === t.path ? "#b3184f" : "#333",
              textDecoration:
                location.pathname === t.path ? "underline" : "none",
              cursor: "pointer",
              "&:hover": { color: "#b3184f" },
            }}
          >
            {t.label} {t.dropdown ? "▾" : ""}
          </Typography>
        ))}
      </Box>

      <Menu
        anchorEl={toolbarAnchorEl}
        open={Boolean(toolbarAnchorEl)}
        onClose={handleToolbarDropdownClose}
      >
        {TOOLBAR_ROUTES.find((t) => t.label === activeDropdown)?.dropdown?.map(
          (d) => (
            <MenuItem
              key={d.path}
              onClick={() => handleToolbarDropdownSelect(d.path)}
            >
              {d.label}
            </MenuItem>
          ),
        )}
      </Menu>

      <Tabs
        value={
          SUB_TABS.findIndex((t) => t.path === location.pathname) === -1
            ? 0
            : SUB_TABS.findIndex((t) => t.path === location.pathname)
        }
        onChange={(e, newValue) => navigate(SUB_TABS[newValue].path)}
        sx={{
          bgcolor: "#e0e0e0",
          minHeight: 32,
          "& .MuiTab-root": {
            minHeight: 32,
            fontSize: 12,
            textTransform: "none",
          },
        }}
      >
        {SUB_TABS.map((t) => (
          <Tab key={t.label} label={t.label} />
        ))}
      </Tabs>

      <Box sx={{ p: 2 }}>
        <Paper variant="outlined" sx={{ p: 2, borderColor: COLORS.border }}>
          <Box sx={{ display: "flex", gap: 2, mb: 1.5, alignItems: "center" }}>
            <Typography sx={{ fontSize: 13, width: 110 }}>
              Customer Name:
            </Typography>
            <TextField
              size="small"
              sx={{ ...fieldSx, width: 220 }}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <IconButton
              size="small"
              sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 0 }}
              onClick={() => setCustomerSearchOpen(true)}
            >
              <Search fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              sx={{ bgcolor: "#7cb342", color: "#fff", borderRadius: "50%" }}
              onClick={() => setAddCustomerOpen(true)}
            >
              <Add fontSize="small" />
            </IconButton>
            <Typography sx={{ fontSize: 13, ml: 2 }}>Cust ID:</Typography>
            <TextField
              size="small"
              sx={{ ...fieldSx, width: 80 }}
              value={customerId ?? ""}
              InputProps={{ readOnly: true }}
            />
            <Select
              size="small"
              value="Reciept"
              sx={{ ...fieldSx, width: 140, ml: "auto" }}
            >
              <MenuItem value="Reciept">Reciept</MenuItem>
              <MenuItem value="Estimate">Estimate</MenuItem>
            </Select>
          </Box>

          <Box sx={{ display: "flex", gap: 2, mb: 1.5, alignItems: "center" }}>
            <Typography sx={{ fontSize: 13, width: 110 }}>Address:</Typography>
            <TextField
              size="small"
              sx={{ ...fieldSx, flex: 1 }}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <Typography sx={{ fontSize: 13, width: 80 }}>Phone No.</Typography>
            <TextField
              size="small"
              sx={{ ...fieldSx, width: 160 }}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Box
              sx={{
                bgcolor: "#f5deb3",
                border: `1px solid ${COLORS.border}`,
                px: 1.5,
                py: 0.5,
                ml: "auto",
              }}
            >
              <Typography sx={{ fontSize: 12 }}>
                Stock in Hand: {stockInHand}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${COLORS.border}`,
              borderRadius: 1,
              p: 1.5,
              mb: 1.5,
              bgcolor: "#fafafa",
            }}
          >
            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>
                  Barcode (F1)
                </Typography>
                <TextField
                  inputRef={barcodeRef}
                  size="small"
                  sx={{ ...fieldSx, width: 170 }}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={handleBarcodeEnter}
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <QrCodeScanner
                          fontSize="small"
                          sx={{ color: COLORS.border }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={searchBarcode}>
                          <Search fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Box sx={{ flex: 1, position: "relative" }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>
                  Item Name (F2)
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Type to search items..."
                  sx={fieldSx}
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search
                          fontSize="small"
                          sx={{ color: COLORS.border }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />

                {searchResults.length > 0 && (
                  <Paper
                    sx={{
                      position: "absolute",
                      zIndex: 10,
                      width: "100%",
                      border: `1px solid ${COLORS.border}`,
                      maxHeight: 260,
                      overflowY: "auto",
                      boxShadow: 3,
                    }}
                  >
                    <Box
                      sx={{
                        px: 1,
                        py: 0.5,
                        bgcolor: "#f0f0f0",
                        borderBottom: `1px solid ${COLORS.border}`,
                        fontSize: 11,
                        color: "text.secondary",
                      }}
                    >
                      {searchResults.length} result
                      {searchResults.length !== 1 ? "s" : ""}
                    </Box>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#e0e0e0" }}>
                          <TableCell sx={cellSx}>BarCode</TableCell>
                          <TableCell sx={cellSx}>ItemName</TableCell>
                          <TableCell sx={cellSx}>SellPrice</TableCell>
                          <TableCell sx={cellSx}>Category</TableCell>
                          <TableCell sx={cellSx}>Manufacture</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {searchResults.map((it, i) => (
                          <TableRow
                            key={it._id}
                            onClick={() => pickItem(it)}
                            sx={{
                              cursor: "pointer",
                              bgcolor: i === 0 ? COLORS.selectedRow : "#fff",
                              "&:hover": { bgcolor: "#bbdefb" },
                            }}
                          >
                            <TableCell sx={cellSx}>{it.barcode}</TableCell>
                            <TableCell sx={cellSx}>{it.itemName}</TableCell>
                            <TableCell sx={cellSx}>{it.sellPrice}</TableCell>
                            <TableCell sx={cellSx}>
                              {it.category?.name || ""}
                            </TableCell>
                            <TableCell sx={cellSx}>
                              {it.manufacturer?.name || ""}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                )}
              </Box>

              <IconButton
                onClick={() => setAdvancedOpen((prev) => !prev)}
                sx={{
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 1,
                  bgcolor: advancedOpen ? COLORS.primary + "15" : "transparent",
                }}
              >
                <Tune
                  fontSize="small"
                  sx={{ color: advancedOpen ? COLORS.primary : "inherit" }}
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

            <Collapse in={advancedOpen}>
              <Box
                sx={{
                  mt: 1.5,
                  pt: 1.5,
                  borderTop: `1px dashed ${COLORS.border}`,
                }}
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
                      <Close fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </Paper>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              mb: 1.5,
              alignItems: "flex-end",
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 12 }}>Discount</Typography>
              <DiscountControl
                baseAmount={Math.max(
                  Number(qty || 0) * Number(price || 0) -
                    Number(qty || 0) * FLAT_DISCOUNT_PER_ITEM,
                  0,
                )}
                value={itemDiscount}
                onChange={setItemDiscount}
                maxDiscountPercent={maxDiscountPercent}
                size="sm"
              />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12 }}>Qty: (F3)</Typography>
              <TextField
                size="small"
                sx={{ ...fieldSx, width: 70 }}
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12 }}>Price: (F4)</Typography>
              <TextField
                size="small"
                sx={{ ...fieldSx, width: 90 }}
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isFOC}
                  onChange={(e) => setIsFOC(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography sx={{ fontSize: 11 }}>FOC</Typography>}
            />
            <Button
              variant="contained"
              size="small"
              sx={{ borderRadius: 0, bgcolor: "#43a047" }}
              onClick={addToCart}
            >
              Add
            </Button>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: "flex", gap: 2 }}>
            <Table
              size="small"
              sx={{ flex: 1, border: `1px solid ${COLORS.border}` }}
            >
              <TableHead>
                <TableRow sx={{ bgcolor: "#e0e0e0" }}>
                  <TableCell sx={cellSx}>BarCode</TableCell>
                  <TableCell sx={cellSx}>ItemName</TableCell>
                  <TableCell sx={cellSx}>Urdu Name</TableCell>
                  <TableCell sx={cellSx}>Qty</TableCell>
                  <TableCell sx={cellSx}>Price</TableCell>
                  <TableCell sx={cellSx}>Discount</TableCell>
                  <TableCell sx={cellSx}>FOC</TableCell>
                  <TableCell sx={cellSx}>ComRateTotal</TableCell>
                  <TableCell sx={cellSx}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cart.map((row, idx) => (
                  <TableRow
                    key={idx}
                    sx={row.isFOC ? { bgcolor: "#fff8e1" } : {}}
                  >
                    <TableCell sx={cellSx}>{row.barcode}</TableCell>
                    <TableCell sx={cellSx}>{row.itemName}</TableCell>
                    <TableCell sx={cellSx}>{row.urduName}</TableCell>
                    <TableCell sx={cellSx} align="center">
                      {row.qty}
                    </TableCell>
                    <TableCell sx={cellSx} align="right">
                      {row.sellPrice}
                    </TableCell>
                    <TableCell sx={cellSx} align="center">
                      <DiscountControl
                        baseAmount={Math.max(
                          row.qty * row.sellPrice -
                            row.qty * FLAT_DISCOUNT_PER_ITEM,
                          0,
                        )}
                        value={row.discount}
                        onChange={(newDiscount) =>
                          updateRowDiscount(idx, newDiscount)
                        }
                        maxDiscountPercent={maxDiscountPercent}
                        size="sm"
                      />
                      {(() => {
                        const { totalDiscount, finalUnitPrice } =
                          computeRowTotals(
                            row.sellPrice,
                            row.qty,
                            row.discount,
                          );
                        return (
                          <Box sx={{ mt: 0.4 }}>
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: "#c62828",
                                fontWeight: 600,
                                lineHeight: 1.3,
                              }}
                            >
                              -{totalDiscount.toFixed(2)}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 10,
                                color: "#2e7d32",
                                fontWeight: 600,
                                lineHeight: 1.3,
                              }}
                            >
                              @{finalUnitPrice.toFixed(2)}
                            </Typography>
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell sx={cellSx} align="center">
                      <Checkbox
                        checked={row.isFOC || false}
                        onChange={(e) => updateRowFOC(idx, e.target.checked)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={cellSx} align="right">
                      {row.isFOC ? (
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: "#c77a1f",
                            fontWeight: 600,
                          }}
                        >
                          FOC (0.00)
                        </Typography>
                      ) : (
                        row.lineTotal.toFixed(2)
                      )}
                    </TableCell>
                    <TableCell sx={cellSx} align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeRow(idx)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Box
              sx={{
                width: 220,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  bgcolor: COLORS.totalBox,
                  color: "#fff",
                  textAlign: "center",
                  py: 0.5,
                }}
              >
                <Typography sx={{ fontSize: 11 }}>Total Qty</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                  {totalQty}
                </Typography>
              </Box>
              <Box
                sx={{
                  bgcolor: COLORS.totalBox2,
                  color: "#fff",
                  textAlign: "center",
                  py: 0.5,
                }}
              >
                <Typography sx={{ fontSize: 11 }}>Total Items</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                  {totalItems}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ borderRadius: 0, fontSize: 10, flex: 1 }}
                  onClick={holdBill}
                >
                  Hold &gt;
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ borderRadius: 0, fontSize: 10, flex: 1 }}
                  onClick={() => setRecallOpen(true)}
                >
                  &lt; Recall {heldBills.length > 0 && `(${heldBills.length})`}
                </Button>
              </Box>

              <Divider sx={{ my: 0.5 }} />

              <Typography sx={{ fontSize: 12 }}>Sub Total Bill:</Typography>
              <TextField
                size="small"
                sx={fieldSx}
                value={subTotalBill.toFixed(2)}
                InputProps={{ readOnly: true }}
              />

              <Typography sx={{ fontSize: 12 }}>Bill Discount F8:</Typography>
              <DiscountControl
                baseAmount={subTotalBill}
                value={billDiscount}
                onChange={setBillDiscount}
                maxDiscountPercent={maxDiscountPercent}
                size="md"
              />

              <Typography sx={{ fontSize: 12 }}>Receivable:</Typography>
              <TextField
                size="small"
                type="number"
                sx={{ ...fieldSx, bgcolor: "#1a1a1a" }}
                value={receivable}
                onChange={(e) => setReceivable(e.target.value)}
              />

              <Typography sx={{ fontSize: 13, fontWeight: 700, mt: 1 }}>
                Net Total (Goods): {netTotal.toFixed(2)}
              </Typography>

              {gstEnabled && (
                <>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                    GST: {totalGstEstimate.toFixed(2)}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                    Additional GST: {additionalGstEstimate.toFixed(2)}
                  </Typography>
                  {focGstEstimate > 0 && (
                    <Typography sx={{ fontSize: 11, color: "#c77a1f" }}>
                      FOC GST (record only): {focGstEstimate.toFixed(2)}
                    </Typography>
                  )}
                </>
              )}

              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
                Grand Total: {grandTotalEstimate.toFixed(2)}
              </Typography>
              <Typography
                sx={{
                  fontSize: 11,
                  color: "text.secondary",
                  textDecoration: "line-through",
                }}
              >
                Without Discount: {grossTotalWithoutDiscount.toFixed(2)}
              </Typography>

              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Button
                  fullWidth
                  variant={paymentType === "CASH" ? "contained" : "outlined"}
                  sx={{
                    borderRadius: 0,
                    fontSize: 12,
                    bgcolor: paymentType === "CASH" ? "#2e7d32" : "transparent",
                    borderColor: "#2e7d32",
                    color: paymentType === "CASH" ? "#fff" : "#2e7d32",
                    "&:hover": {
                      bgcolor: paymentType === "CASH" ? "#1b5e20" : "#e8f5e9",
                    },
                  }}
                  onClick={() => setPaymentType("CASH")}
                >
                  Cash Sale
                </Button>
                <Button
                  fullWidth
                  variant={paymentType === "CARD" ? "contained" : "outlined"}
                  sx={{
                    borderRadius: 0,
                    fontSize: 12,
                    bgcolor: paymentType === "CARD" ? "#1565c0" : "transparent",
                    borderColor: "#1565c0",
                    color: paymentType === "CARD" ? "#fff" : "#1565c0",
                    "&:hover": {
                      bgcolor: paymentType === "CARD" ? "#0d47a1" : "#e3f2fd",
                    },
                  }}
                  onClick={() => setPaymentType("CARD")}
                >
                  Card Sale
                </Button>
              </Box>

              <Button
                variant="contained"
                fullWidth
                sx={{ borderRadius: 0, bgcolor: "#1565c0", mt: 1 }}
                onClick={() => {
                  setTenders([
                    {
                      id: Date.now(),
                      method: paymentType,
                      amount: grandTotalEstimate.toFixed(2),
                    },
                  ]);
                  setPaymentDialogOpen(true);
                }}
                disabled={saving || cart.length === 0}
              >
                {saving
                  ? `Saving (${paymentType})...`
                  : `Save ${paymentType === "CASH" ? "Cash" : "Card"} (F12)`}
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12 }}>Remarks:</Typography>
              <TextField
                size="small"
                fullWidth
                sx={fieldSx}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Box>
            <Box sx={{ width: 200 }}>
              <Typography sx={{ fontSize: 12 }}>Bilti No.</Typography>
              <TextField
                size="small"
                fullWidth
                sx={fieldSx}
                value={biltiNo}
                onChange={(e) => setBiltiNo(e.target.value)}
              />
            </Box>
          </Box>
        </Paper>
      </Box>

      <Dialog
        open={customerSearchOpen}
        onClose={() => setCustomerSearchOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontSize: 16 }}>Search Customer</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Type customer name..."
            value={customerSearchText}
            onChange={(e) => setCustomerSearchText(e.target.value)}
            sx={{ mb: 1 }}
          />
          <List dense sx={{ maxHeight: 300, overflowY: "auto" }}>
            {customerSearchResults.map((c) => (
              <ListItemButton key={c._id} onClick={() => selectCustomer(c)}>
                <ListItemText
                  primary={c.name}
                  secondary={c.phone || "No phone"}
                />
              </ListItemButton>
            ))}
            {customerSearchText && customerSearchResults.length === 0 && (
              <Typography sx={{ fontSize: 13, color: "text.secondary", p: 1 }}>
                No customer found
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerSearchOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontSize: 16 }}>Add New Customer</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
        >
          <TextField
            label="Name"
            size="small"
            fullWidth
            value={newCustomer.name}
            onChange={(e) =>
              setNewCustomer((p) => ({ ...p, name: e.target.value }))
            }
          />
          <TextField
            label="Phone"
            size="small"
            fullWidth
            value={newCustomer.phone}
            onChange={(e) =>
              setNewCustomer((p) => ({ ...p, phone: e.target.value }))
            }
          />
          <TextField
            label="Address"
            size="small"
            fullWidth
            value={newCustomer.address}
            onChange={(e) =>
              setNewCustomer((p) => ({ ...p, address: e.target.value }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCustomerOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submitNewCustomer}
            disabled={addingCustomer}
          >
            {addingCustomer ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={recallOpen}
        onClose={() => setRecallOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontSize: 16 }}>Recall Held Bills</DialogTitle>
        <DialogContent>
          {heldBills.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: "text.secondary", p: 1 }}>
              Koi held bill nahi hai
            </Typography>
          ) : (
            <List dense>
              {heldBills.map((h) => (
                <ListItemButton
                  key={h.id}
                  onClick={() => recallBill(h)}
                  sx={{ border: `1px solid ${COLORS.border}`, mb: 1 }}
                >
                  <ListItemText
                    primary={`${h.customerName} - ${h.cart.length} items`}
                    secondary={`Held: ${h.heldAt} | Total: ${h.cart.reduce((s, r) => s + r.lineTotal, 0).toFixed(2)}`}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecallOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontSize: 16 }}>
          Confirm {paymentType === "CASH" ? "Cash" : "Card"} Payment
        </DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 13 }}>Sub Total</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
              {subTotalBill.toFixed(2)}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 12, mb: 0.5 }}>Discount</Typography>
            <DiscountControl
              baseAmount={subTotalBill}
              value={billDiscount}
              onChange={setBillDiscount}
              maxDiscountPercent={maxDiscountPercent}
              size="md"
            />
          </Box>

          {gstEnabled && (
            <>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  GST
                </Typography>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {totalGstEstimate.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  Additional GST
                </Typography>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {additionalGstEstimate.toFixed(2)}
                </Typography>
              </Box>
            </>
          )}

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: `1px dashed ${COLORS.border}`,
              pt: 1,
            }}
          >
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              Grand Total
            </Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              {grandTotalEstimate.toFixed(2)}
            </Typography>
          </Box>

          <TextField
            label="Receivable (Udhar)"
            size="small"
            type="number"
            fullWidth
            value={receivable}
            onChange={(e) => setReceivable(e.target.value)}
            sx={{ display: "none" }}
          />

          <Box
            sx={{
              borderTop: `1px dashed ${COLORS.border}`,
              pt: 1.5,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
              Tender / Payment
            </Typography>

            {tenders.map((t) => (
              <Box
                key={t.id}
                sx={{ display: "flex", gap: 1, alignItems: "center" }}
              >
                <TextField
                  select
                  size="small"
                  value={t.method}
                  onChange={(e) =>
                    updateTenderRow(t.id, "method", e.target.value)
                  }
                  sx={{ ...fieldSx, width: 140 }}
                >
                  {TENDER_METHODS.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  type="number"
                  placeholder="Amount"
                  value={t.amount}
                  onChange={(e) =>
                    updateTenderRow(t.id, "amount", e.target.value)
                  }
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <IconButton
                  size="small"
                  onClick={() => removeTenderRow(t.id)}
                  disabled={tenders.length === 1}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            ))}

            <Button
              size="small"
              variant="outlined"
              startIcon={<Add fontSize="small" />}
              onClick={addTenderRow}
              sx={{ alignSelf: "flex-start", borderRadius: 0 }}
            >
              Add Tender
            </Button>

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}
            >
              <Typography sx={{ fontSize: 13 }}>Total Tendered</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                {totalTendered.toFixed(2)}
              </Typography>
            </Box>

            {changeDue > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 13, color: "#2e7d32" }}>
                  Change Due
                </Typography>
                <Typography
                  sx={{ fontSize: 13, fontWeight: 700, color: "#2e7d32" }}
                >
                  {changeDue.toFixed(2)}
                </Typography>
              </Box>
            )}

            {balanceRemaining > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 13, color: "#c62828" }}>
                  Receivable (Udhar)
                </Typography>
                <Typography
                  sx={{ fontSize: 13, fontWeight: 700, color: "#c62828" }}
                >
                  {balanceRemaining.toFixed(2)}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            sx={{
              bgcolor: paymentType === "CASH" ? "#2e7d32" : "#1565c0",
            }}
            onClick={confirmPaymentAndSave}
            disabled={saving || openingDrawer}
          >
            {saving
              ? "Saving..."
              : openingDrawer
                ? "Opening Drawer..."
                : "Confirm & Open Drawer"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={printChoiceOpen}
        onClose={() => setPrintChoiceOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontSize: 16 }}>
          Sale Saved: {lastSale?.invoiceNo}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, mb: 2 }}>
            Receipt print karna hai? Printer type select karein:
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<Print />}
              fullWidth
              onClick={printThermal}
            >
              Thermal
            </Button>
            <Button
              variant="contained"
              startIcon={<Print />}
              fullWidth
              color="secondary"
              onClick={printLaser}
            >
              Laser (A5)
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintChoiceOpen(false)}>Skip</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
