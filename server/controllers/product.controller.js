const Product = require("../models/product.model"); // apna actual path check kar lena

// @desc    Create new product
// @route   POST /api/products
const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      priceTiers,
      barcode,
      stock,
      sku,
      image,
      description,
    } = req.body;

    if (!name || !priceTiers?.retail) {
      return res
        .status(400)
        .json({ message: "Name aur retail price required hain" });
    }

    // Barcode already exist to nahi karta - manual check (unique+sparse index bhi hey, ye friendly error deta hey)
    if (barcode) {
      const existing = await Product.findOne({ barcode, isActive: true });
      if (existing) {
        return res.status(400).json({
          message: `Ye barcode "${barcode}" pehle se kisi product mein use ho raha hey`,
        });
      }
    }

    const product = await Product.create({
      name,
      category,
      priceTiers,
      barcode: barcode || undefined, // empty string na jaye, warna sparse unique tootega
      stock,
      sku,
      image,
      description,
    });

    return res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Barcode ya SKU duplicate hey" });
    }
    console.error("createProduct error:", error);
    return res
      .status(500)
      .json({ message: "Product create nahi ho saka", error: error.message });
  }
};

// @desc    Get all products (search + category filter + pagination)
// @route   GET /api/products?search=&category=&page=&limit=
const getAllProducts = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 50 } = req.query;

    const filter = { isActive: true };

    if (category && category !== "All") {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ name: 1 }).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      products,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("getAllProducts error:", error);
    return res
      .status(500)
      .json({ message: "Products fetch nahi ho sake", error: error.message });
  }
};

// @desc    Get single product by Mongo _id
// @route   GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true,
    });
    if (!product) {
      return res.status(404).json({ message: "Product nahi mila" });
    }
    return res.status(200).json(product);
  } catch (error) {
    console.error("getProductById error:", error);
    return res
      .status(500)
      .json({ message: "Product fetch nahi ho saka", error: error.message });
  }
};

// @desc    Get single product by barcode (F1 scan use-case, billing screen)
// @route   GET /api/products/barcode/:code
const getProductByBarcode = async (req, res) => {
  try {
    const product = await Product.findOne({
      barcode: req.params.code,
      isActive: true,
    });
    if (!product) {
      return res
        .status(404)
        .json({ message: "Is barcode ka product nahi mila" });
    }
    return res.status(200).json(product);
  } catch (error) {
    console.error("getProductByBarcode error:", error);
    return res
      .status(500)
      .json({ message: "Barcode lookup fail hui", error: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const { barcode } = req.body;

    if (barcode) {
      const existing = await Product.findOne({
        barcode,
        isActive: true,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({
          message: `Ye barcode "${barcode}" kisi aur product mein use ho raha hey`,
        });
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: false,
    });

    if (!product) {
      return res.status(404).json({ message: "Product nahi mila" });
    }

    return res.status(200).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Barcode ya SKU duplicate hey" });
    }
    console.error("updateProduct error:", error);
    return res
      .status(500)
      .json({ message: "Product update nahi ho saka", error: error.message });
  }
};

// @desc    Soft delete product
// @route   DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true, runValidators: false },
    );

    if (!product) {
      return res.status(404).json({ message: "Product nahi mila" });
    }

    return res.status(200).json({ message: "Product delete ho gaya", product });
  } catch (error) {
    console.error("deleteProduct error:", error);
    return res
      .status(500)
      .json({ message: "Product delete nahi ho saka", error: error.message });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  getProductByBarcode,
  updateProduct,
  deleteProduct,
};
