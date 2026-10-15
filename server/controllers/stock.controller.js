const Item = require("../models/item.model");
const StockLedger = require("../models/stockLedger.model");

// GET /api/stock  - current stock of all items (Stock tab main table)
const getCurrentStock = async (req, res) => {
  try {
    const items = await Item.find({ isActive: true })
      .populate("category", "name")
      .select("barcode itemName stockQty minStockAlert sellPrice purchasePrice")
      .sort({ itemName: 1 });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/stock/low - items at/below their minStockAlert
const getLowStock = async (req, res) => {
  try {
    const items = await Item.find({
      isActive: true,
      $expr: { $lte: ["$stockQty", "$minStockAlert"] },
    }).select("barcode itemName stockQty minStockAlert");
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/stock/ledger/:itemId - full movement history for one item
const getItemLedger = async (req, res) => {
  try {
    const ledger = await StockLedger.find({ item: req.params.itemId }).sort({
      date: -1,
    });
    res.json({ success: true, ledger });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/stock/adjust  - manual stock correction (breakage, count mismatch, etc.)
// body: { item, qty, direction: "IN"|"OUT", reason }
const adjustStock = async (req, res) => {
  try {
    const { item, qty, direction, reason } = req.body;
    if (!qty || qty <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Qty valid honi chahiye" });

    const delta = direction === "OUT" ? -qty : qty;
    const updatedItem = await Item.findByIdAndUpdate(
      item,
      { $inc: { stockQty: delta } },
      { new: true, runValidators: false },
    );
    if (!updatedItem)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    await StockLedger.create({
      item,
      type: "ADJUST",
      qty,
      refType: "Adjustment",
      refId: updatedItem._id,
      balanceAfter: updatedItem.stockQty,
    });

    res.json({ success: true, item: updatedItem, reason });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCurrentStock, getLowStock, getItemLedger, adjustStock };
