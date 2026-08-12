import Product from '../models/Product.js';

// @desc----> Get all products (with Search, Category filter, and Pagination)
// @route---->GET /api/products
// @access ---->Private
export const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // 1. Search filter (checks name or SKU)
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { SKU: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // 2. Category filter
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Fetch products and total count
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      products,
      page,
      pages: Math.ceil(total / limit),
      totalProducts: total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Private
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private (Admin, Sales_Manager, Purchase_Manager)
export const createProduct = async (req, res) => {
  try {
    const { name, SKU, category, price, description, stock, reorderLevel } = req.body;

    const skuExists = await Product.findOne({ SKU: SKU.toUpperCase() });
    if (skuExists) {
      return res.status(400).json({ message: 'Product with this SKU already exists' });
    }

    const product = await Product.create({
      name,
      SKU,
      category,
      price,
      description,
      stock,
      reorderLevel,
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update product details
// @route   PUT /api/products/:id
// @access  Private (Admin, Sales_Manager, Purchase_Manager)
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Restrict fields for Inventory Manager role
    if (req.user && req.user.role === 'Inventory_Manager') {
      const allowedUpdates = ['stock', 'reorderLevel'];
      const updates = Object.keys(req.body);
      const isValidOperation = updates.every(update => allowedUpdates.includes(update));
      if (!isValidOperation) {
        return res.status(403).json({ message: 'Inventory Managers are only authorized to update stock and reorder levels' });
      }
    }

    // Update fields dynamically
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Product removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get low stock alerts (dashboard helper)
// @route   GET /api/products/alerts/low-stock
// @access  Private
export const getLowStockProducts = async (req, res) => {
  try {
    // Find where stock is less than or equal to reorderLevel
    const products = await Product.find({
      $expr: { $lte: ['$stock', '$reorderLevel'] }
    });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
