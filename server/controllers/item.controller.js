const Item = require("../models/item.model");

// POST /api/items
const createItem = async (req, res) => {
  try {
    const item = await Item.create(req.body);
    res.status(201).json({ success: true, item });
  } catch (error) {
    // fix: duplicate barcode par Mongo ka raw "E11000..." error jata tha, ab clean message
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye barcode pehle se kisi item ke sath registered hai",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/items  (Items tab - full list)
const getAllItems = async (req, res) => {
  try {
    const items = await Item.find({ isActive: true })
      .populate("category", "name")
      .populate("manufacturer", "name")
      .sort({ createdAt: -1 });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/items/search-barcode/:code   (F1 field - exact match, fast scan)
const searchByBarcode = async (req, res) => {
  try {
    const item = await Item.findOne({
      barcode: req.params.code,
      isActive: true,
    })
      .populate("category", "name")
      .populate("manufacturer", "name");
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/items/search-name?q=R   (F2 field - live search jaise screenshot mein "R" type hote hi list aa rahi hai)
const searchByName = async (req, res) => {
  try {
    const { q } = req.query;
    const items = await Item.find({
      itemName: { $regex: q || "", $options: "i" },
      isActive: true,
    })
      .populate("category", "name")
      .populate("manufacturer", "name")
      .limit(20);
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/items/:id  -> hamesha findByIdAndUpdate, kabhi item.save() nahi (re-validation errors se bachne ke liye)
const updateItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: false,
    });
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    res.json({ success: true, item });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye barcode pehle se kisi item ke sath registered hai",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/items/:id -> soft delete (isActive false), taake purani Sale/Purchase history na tootay
const deleteItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true, runValidators: false },
    );
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    res.json({ success: true, message: "Item deactivated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/items/search  (Sales page - multi-criteria filter)
const searchItems = async (req, res) => {
  try {
    const {
      q, // itemName ya barcode dono ke liye combined text search
      category,
      manufacturer,
      minPrice,
      maxPrice,
      stockStatus, // "in_stock" | "low_stock" | "out_of_stock"
      limit = 20,
    } = req.query;

    const filter = { isActive: true };
    const andConditions = [];

    if (q) {
      filter.$or = [
        { itemName: { $regex: q, $options: "i" } },
        { barcode: { $regex: q, $options: "i" } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (manufacturer) {
      filter.manufacturer = manufacturer;
    }

    // fix: schema field "sellPrice" hai, "salePrice" nahi
    if (minPrice || maxPrice) {
      filter.sellPrice = {};
      if (minPrice) filter.sellPrice.$gte = Number(minPrice);
      if (maxPrice) filter.sellPrice.$lte = Number(maxPrice);
    }

    // fix: schema field "stockQty" hai, "stock" nahi. Aur low_stock ab har
    // item ke apne "minStockAlert" ke against dynamically check hota hai
    // (pehle hardcoded <=10 tha, jabke har item ka apna threshold hai)
    if (stockStatus === "out_of_stock") {
      filter.stockQty = { $lte: 0 };
    } else if (stockStatus === "low_stock") {
      andConditions.push({
        $expr: {
          $and: [
            { $gt: ["$stockQty", 0] },
            { $lte: ["$stockQty", "$minStockAlert"] },
          ],
        },
      });
    } else if (stockStatus === "in_stock") {
      andConditions.push({
        $expr: { $gt: ["$stockQty", "$minStockAlert"] },
      });
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const items = await Item.find(filter)
      .populate("category", "name")
      .populate("manufacturer", "name")
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createItem,
  getAllItems,
  searchByBarcode,
  searchByName,
  searchItems,
  updateItem,
  deleteItem,
};
