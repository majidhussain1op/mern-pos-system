const Supplier = require("../models/supplier.model");

// GET /api/suppliers/search?q=abc
const searchSuppliers = async (req, res) => {
  try {
    const { q } = req.query;
    const suppliers = await Supplier.find({
      name: { $regex: q || "", $options: "i" },
    }).limit(20);
    res.json({ success: true, suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/manufacturers  (Manufacturer/Supplier same model hai)
const createSupplier = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Supplier/Manufacturer naam zaroori hai",
        });
    }
    const supplier = await Supplier.create({
      name: name.trim(),
      phone,
      address,
    });
    res.status(201).json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/manufacturers
const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    // fix: FillReceipt.jsx "manufacturers" key expect karta hai,
    // CategorySupplierManager.jsx "suppliers" key — dono bhej do taake
    // dono jagah kaam kare, ek dusre ko break kiye bina
    res.json({ success: true, suppliers, manufacturers: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/manufacturers/:id
// note: "balance" field yahan se kabhi update nahi hota — wo sirf Purchase/Payment
// transactions se badalta hai (jaisa CustomerLedger cashier ke liye hai)
const updateSupplier = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { name: name?.trim(), phone, address },
      { new: true, runValidators: false },
    );
    if (!supplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }
    res.json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/manufacturers/:id
const deleteSupplier = async (req, res) => {
  try {
    const Item = require("../models/item.model");
    const inUse = await Item.countDocuments({
      manufacturer: req.params.id,
      isActive: true,
    });

    if (inUse > 0) {
      return res.status(400).json({
        success: false,
        message: `Ye supplier ${inUse} item(s) mein use ho raha hai, pehle unko doosre supplier mein move karo`,
      });
    }

    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }
    res.json({ success: true, message: "Supplier deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createSupplier,
  getAllSuppliers,
  updateSupplier,
  deleteSupplier,
  searchSuppliers,
};
