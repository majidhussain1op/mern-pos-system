const Category = require("../models/category.model");

// POST /api/categories
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Category name zaroori hai" });
    }
    const category = await Category.create({ name: name.trim() });
    res.status(201).json({ success: true, category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye category naam pehle se maujood hai",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/categories/:id
const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name: name?.trim() },
      { new: true, runValidators: false },
    );
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye category naam pehle se maujood hai",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/categories/:id
// Hard-delete se pehle check karo koi item is category ko use to nahi kar raha
// (warna un items ka category dropdown mein orphan reference reh jayega)
const deleteCategory = async (req, res) => {
  try {
    const Item = require("../models/item.model");
    const inUse = await Item.countDocuments({
      category: req.params.id,
      isActive: true,
    });

    if (inUse > 0) {
      return res.status(400).json({
        success: false,
        message: `Ye category ${inUse} item(s) mein use ho rahi hai, pehle unko doosri category mein move karo`,
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
};
