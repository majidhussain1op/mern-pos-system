const Purchase = require("../models/purchase.model");
const Item = require("../models/item.model");
const Supplier = require("../models/supplier.model");
const StockLedger = require("../models/stockLedger.model");
const { postPurchaseJournal } = require("../services/Accounting.services");

const getUserId = (req) => req.user?.id || req.user?._id;

// POST /api/purchases
// Direct purchase (bina formal PO ke) - chhote/urgent purchases ke liye
// body: { invoiceNo, supplier, items: [{item, qty, purchasePrice}], paidAmount, remarks }
const createPurchase = async (req, res) => {
  try {
    const { supplier, items, paidAmount = 0, remarks } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Purchase mein kam az kam 1 item zaroori hai",
      });
    }

    const totalAmount = items.reduce(
      (sum, i) => sum + i.qty * i.purchasePrice,
      0,
    );
    const balance = totalAmount - paidAmount;
    const invoiceNo = req.body.invoiceNo || `PUR-${Date.now()}`;

    const purchase = await Purchase.create({
      invoiceNo,
      supplier,
      items,
      totalAmount,
      paidAmount,
      balance: balance > 0 ? balance : 0,
      remarks,
      createdBy: getUserId(req), // fix: pehle set hi nahi ho raha tha
    });

    for (const line of items) {
      const updatedItem = await Item.findByIdAndUpdate(
        line.item,
        {
          $inc: { stockQty: line.qty },
          $set: { purchasePrice: line.purchasePrice },
        },
        { new: true, runValidators: false },
      );

      await StockLedger.create({
        item: line.item,
        type: "IN",
        qty: line.qty,
        refType: "Purchase",
        refId: purchase._id,
        balanceAfter: updatedItem.stockQty,
      });
    }

    if (balance > 0) {
      await Supplier.findByIdAndUpdate(
        supplier,
        { $inc: { balance } },
        { new: true, runValidators: false },
      );
    }

    // Accounting: Dr Inventory, Cr Cash (paid) + Accounts Payable (baaki)
    try {
      await postPurchaseJournal({ purchase, createdBy: getUserId(req) });
    } catch (journalError) {
      console.error(
        "postPurchaseJournal error (purchase saved, journal failed):",
        journalError,
      );
    }

    res.status(201).json({ success: true, purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/purchases
const getAllPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate("supplier", "name")
      .populate("items.item", "itemName barcode")
      .sort({ date: -1 });
    res.json({ success: true, purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createPurchase, getAllPurchases };
