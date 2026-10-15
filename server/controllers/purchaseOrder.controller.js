const PurchaseOrder = require("../models/purchaseOrder.model");
const Purchase = require("../models/purchase.model");
const Item = require("../models/item.model");
const Supplier = require("../models/supplier.model");
const StockLedger = require("../models/stockLedger.model");
const { postPurchaseJournal } = require("../services/Accounting.services");

const getUserId = (req) => req.user?.id || req.user?._id;

// Helper: generate a unique, human-readable PO number
const generatePoNumber = async () => {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const countToday = await PurchaseOrder.countDocuments({
    poNumber: { $regex: `^PO-${datePart}` },
  });
  return `PO-${datePart}-${String(countToday + 1).padStart(3, "0")}`;
};

// POST /api/purchase-orders
// body: { supplier, items: [{item, qtyOrdered, expectedPrice}], notes }
const createPO = async (req, res) => {
  try {
    const { supplier, items, notes } = req.body;

    if (!supplier) {
      return res
        .status(400)
        .json({ success: false, message: "Supplier zaroori hai" });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "PO mein kam az kam 1 item zaroori hai",
      });
    }

    const poNumber = await generatePoNumber();

    const po = await PurchaseOrder.create({
      poNumber,
      supplier,
      items: items.map((i) => ({
        item: i.item,
        qtyOrdered: i.qtyOrdered,
        expectedPrice: i.expectedPrice || 0,
        qtyReceived: 0,
      })),
      notes: notes || "",
      createdBy: getUserId(req),
    });

    return res.status(201).json({ success: true, po });
  } catch (error) {
    console.error("createPO error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/purchase-orders/:id  (sirf DRAFT status mein edit ho sakta hai)
const updatePO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      return res.status(404).json({ success: false, message: "PO not found" });
    }
    if (po.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message: `PO "${po.status}" status mein hai, sirf DRAFT PO edit ho sakta hai`,
      });
    }

    const { supplier, items, notes } = req.body;
    if (supplier) po.supplier = supplier;
    if (items) {
      po.items = items.map((i) => ({
        item: i.item,
        qtyOrdered: i.qtyOrdered,
        expectedPrice: i.expectedPrice || 0,
        qtyReceived: 0,
      }));
    }
    if (notes !== undefined) po.notes = notes;

    await po.save();
    return res.status(200).json({ success: true, po });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/purchase-orders/:id/send  (DRAFT -> SENT)
const sendPO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({
      _id: req.params.id,
      status: "DRAFT",
    });
    if (!po) {
      return res.status(400).json({
        success: false,
        message: "Ye PO DRAFT status mein nahi hai ya mila nahi",
      });
    }
    po.status = "SENT";
    po.sentAt = new Date();
    await po.save();
    return res.status(200).json({ success: true, po });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/purchase-orders/:id/confirm  (SENT -> CONFIRMED)
// Manual toggle hai kyunki supplier ka koi apna portal/login nahi hai -
// jab supplier phone/email pe confirm kare, admin yahan click kar deta hai
const confirmPO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({
      _id: req.params.id,
      status: "SENT",
    });
    if (!po) {
      return res.status(400).json({
        success: false,
        message: "Ye PO SENT status mein nahi hai ya mila nahi",
      });
    }
    po.status = "CONFIRMED";
    po.confirmedAt = new Date();
    await po.save();
    return res.status(200).json({ success: true, po });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/purchase-orders/:id/cancel  (RECEIVED ke ilawa kisi bhi status se cancel ho sakta hai)
const cancelPO = async (req, res) => {
  try {
    const { reason } = req.body;
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      return res.status(404).json({ success: false, message: "PO not found" });
    }
    if (po.status === "RECEIVED") {
      return res.status(400).json({
        success: false,
        message: "Poori tarah receive ho chuka PO cancel nahi ho sakta",
      });
    }
    if (po.status === "CANCELLED") {
      return res
        .status(400)
        .json({ success: false, message: "Ye PO pehle se cancelled hai" });
    }

    po.status = "CANCELLED";
    po.notes = reason ? `${po.notes}\nCancelled: ${reason}` : po.notes;
    await po.save();
    return res.status(200).json({ success: true, po });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/purchase-orders/:id/receive
// Goods receive karna - PO se link ho kar ek Purchase (stock-in) banti hai.
// Partial receiving support hai - qtyReceived line-wise track hoti hai,
// jab tak sab lines pura receive na ho jayen status PARTIALLY_RECEIVED rehta hai.
// body: { items: [{item, qty, purchasePrice}], paidAmount, remarks }
const receiveGoods = async (req, res) => {
  try {
    const { items, paidAmount = 0, remarks } = req.body;
    const po = await PurchaseOrder.findOne({
      _id: req.params.id,
      status: { $in: ["CONFIRMED", "PARTIALLY_RECEIVED"] },
    });

    if (!po) {
      return res.status(400).json({
        success: false,
        message:
          "Sirf CONFIRMED ya PARTIALLY_RECEIVED PO pe goods receive ho sakte hain",
      });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Receive karne ke liye kam az kam 1 item zaroori hai",
      });
    }

    // Validate: jo receive kar rahe hain wo PO mein hi ho aur remaining qty se zyada na ho
    for (const line of items) {
      const poLine = po.items.find((p) => String(p.item) === String(line.item));
      if (!poLine) {
        return res.status(400).json({
          success: false,
          message: `Ye item is PO mein order hi nahi hua tha`,
        });
      }
      const remaining = poLine.qtyOrdered - poLine.qtyReceived;
      if (line.qty > remaining) {
        return res.status(400).json({
          success: false,
          message: `Sirf ${remaining} qty baaki hai receive karne ko is item ki`,
        });
      }
    }

    const totalAmount = items.reduce(
      (sum, i) => sum + i.qty * i.purchasePrice,
      0,
    );
    const balance = totalAmount - paidAmount;
    const invoiceNo = `PUR-${Date.now()}`;

    const purchase = await Purchase.create({
      invoiceNo,
      supplier: po.supplier,
      purchaseOrder: po._id,
      items: items.map(({ item, qty, purchasePrice }) => ({
        item,
        qty,
        purchasePrice,
      })),
      totalAmount,
      paidAmount,
      balance: balance > 0 ? balance : 0,
      remarks,
      createdBy: getUserId(req),
    });

    // Stock IN + ledger + purchasePrice update (latest cost)
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

      // PO line ki qtyReceived update
      const poLine = po.items.find((p) => String(p.item) === String(line.item));
      poLine.qtyReceived += line.qty;
    }

    if (balance > 0) {
      await Supplier.findByIdAndUpdate(
        po.supplier,
        { $inc: { balance } },
        { new: true, runValidators: false },
      );
    }

    // Accounting: Dr Inventory, Cr Cash (paid) + Accounts Payable (baaki) -
    // purchase.controller.js wala hi helper reuse ho raha hai, kyunki ye bhi
    // ek Purchase document hi hai (bas PO se linked)
    try {
      await postPurchaseJournal({ purchase, createdBy: getUserId(req) });
    } catch (journalError) {
      console.error(
        "postPurchaseJournal error (PO receive saved, journal failed):",
        journalError,
      );
    }

    // PO status update karo based on ke sab lines pura receive hue ya nahi
    const fullyReceived = po.items.every((p) => p.qtyReceived >= p.qtyOrdered);
    po.status = fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";
    if (fullyReceived) po.completedAt = new Date();
    await po.save();

    return res.status(201).json({ success: true, purchase, po });
  } catch (error) {
    console.error("receiveGoods error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/purchase-orders?status=&supplier=&page=&limit=
const getAllPOs = async (req, res) => {
  try {
    const { status, supplier, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (supplier) filter.supplier = supplier;

    const pos = await PurchaseOrder.find(filter)
      .populate("supplier", "name phone")
      .populate("items.item", "itemName barcode")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await PurchaseOrder.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: pos,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/purchase-orders/:id
const getPOById = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate("supplier", "name phone address")
      .populate("items.item", "itemName barcode unit");
    if (!po) {
      return res.status(404).json({ success: false, message: "PO not found" });
    }

    // Isi PO se linked saari purchases (partial receiving history dikhane ke liye)
    const purchases = await Purchase.find({ purchaseOrder: po._id }).sort({
      date: 1,
    });

    return res.status(200).json({ success: true, po, purchases });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPO,
  updatePO,
  sendPO,
  confirmPO,
  cancelPO,
  receiveGoods,
  getAllPOs,
  getPOById,
};
