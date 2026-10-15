const PurchaseReturn = require("../models/purchaseReturn.model");
const Item = require("../models/item.model");
const Supplier = require("../models/supplier.model");
const StockLedger = require("../models/stockLedger.model");
const {
  postPurchaseReturnJournal,
} = require("../services/Accounting.services");

const getUserId = (req) => req.user?.id || req.user?._id;

const generateReturnNumber = async () => {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const countToday = await PurchaseReturn.countDocuments({
    returnNo: { $regex: `^PR-${datePart}` },
  });
  return `PR-${datePart}-${String(countToday + 1).padStart(3, "0")}`;
};

// POST /api/purchase-returns
// body: { supplier, purchase (optional), items: [{item, qty, purchasePrice}], reason }
const createPurchaseReturn = async (req, res) => {
  const decrementedSoFar = []; // rollback ke liye, jaisa createSale mein tha

  const rollbackDecrements = async () => {
    for (const d of decrementedSoFar) {
      await Item.findByIdAndUpdate(
        d.itemId,
        { $inc: { stockQty: d.qty } },
        { runValidators: false },
      );
    }
  };

  try {
    const { supplier, purchase, items, reason } = req.body;

    if (!supplier) {
      return res
        .status(400)
        .json({ success: false, message: "Supplier zaroori hai" });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Return mein kam az kam 1 item zaroori hai",
      });
    }

    // Atomic stock decrement (hard-block agar stock hi nahi hai return karne
    // jitna) - bilkul createSale wali atomic + rollback pattern
    const stockResults = [];
    for (const line of items) {
      const dbItem = await Item.findById(line.item);
      if (!dbItem) {
        await rollbackDecrements();
        return res
          .status(404)
          .json({ success: false, message: `Item not found: ${line.item}` });
      }

      const updatedItem = await Item.findOneAndUpdate(
        { _id: line.item, stockQty: { $gte: line.qty } },
        { $inc: { stockQty: -line.qty } },
        { new: true, runValidators: false },
      );

      if (!updatedItem) {
        await rollbackDecrements();
        return res.status(400).json({
          success: false,
          message: `"${dbItem.itemName}" ka stock (${dbItem.stockQty}) itna nahi ke ${line.qty} return ho sake`,
        });
      }

      decrementedSoFar.push({ itemId: line.item, qty: line.qty });
      stockResults.push({
        item: line.item,
        balanceAfter: updatedItem.stockQty,
      });
    }

    const preparedItems = items.map((i) => ({
      item: i.item,
      qty: i.qty,
      purchasePrice: i.purchasePrice,
      lineTotal: i.qty * i.purchasePrice,
    }));
    const totalAmount = preparedItems.reduce((sum, i) => sum + i.lineTotal, 0);
    const returnNo = await generateReturnNumber();

    let purchaseReturn;
    try {
      purchaseReturn = await PurchaseReturn.create({
        returnNo,
        supplier,
        purchase: purchase || null,
        items: preparedItems,
        totalAmount,
        reason: reason || "",
        createdBy: getUserId(req),
      });
    } catch (createError) {
      await rollbackDecrements();
      throw createError;
    }

    for (const line of preparedItems) {
      const result = stockResults.find(
        (r) => String(r.item) === String(line.item),
      );
      await StockLedger.create({
        item: line.item,
        type: "OUT",
        qty: line.qty,
        refType: "PurchaseReturn",
        refId: purchaseReturn._id,
        balanceAfter: result.balanceAfter,
      });
    }

    // Return ki value jitna supplier ko humara payable (balance) kam ho jata hai
    // (hum unko maal wapas kar rahe hain, matlab utna kam dena hai ab)
    await Supplier.findByIdAndUpdate(
      supplier,
      { $inc: { balance: -totalAmount } },
      { new: true, runValidators: false },
    );

    // Accounting: Dr Accounts Payable (jo dena tha wo kam hua), Cr Inventory (stock kam hua)
    try {
      await postPurchaseReturnJournal({
        purchaseReturn,
        createdBy: getUserId(req),
      });
    } catch (journalError) {
      console.error(
        "postPurchaseReturnJournal error (return saved, journal failed):",
        journalError,
      );
    }

    return res.status(201).json({ success: true, purchaseReturn });
  } catch (error) {
    console.error("createPurchaseReturn error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/purchase-returns?supplier=&from=&to=
const getAllPurchaseReturns = async (req, res) => {
  try {
    const { supplier, from, to } = req.query;
    const filter = {};
    if (supplier) filter.supplier = supplier;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const returns = await PurchaseReturn.find(filter)
      .populate("supplier", "name")
      .populate("items.item", "itemName barcode")
      .populate("purchase", "invoiceNo")
      .sort({ date: -1 });

    res.json({ success: true, returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createPurchaseReturn, getAllPurchaseReturns };
