import Product, { PRODUCT_CATEGORIES } from '../models/Product.js';

// @desc----> Get all products (with Search, Category filter, and Pagination)
// @route---->GET /api/products
// @access ---->Private
export const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};

    // 1. Search filter (checks name or SKU or category)
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search.trim(), $options: 'i' } },
        { SKU: { $regex: req.query.search.trim(), $options: 'i' } },
        { category: { $regex: req.query.search.trim(), $options: 'i' } },
      ];
    }

    // 2. Category filter
    if (req.query.category && req.query.category !== 'All') {
      query.category = req.query.category;
    }

    // Determine sorting: default to most recently updated / received items first
    let sortObj = { updatedAt: -1, createdAt: -1 };
    if (req.query.sortBy === 'name') sortObj = { name: 1 };
    if (req.query.sortBy === 'price_asc') sortObj = { price: 1 };
    if (req.query.sortBy === 'price_desc') sortObj = { price: -1 };
    if (req.query.sortBy === 'stock_high') sortObj = { available: -1, stock: -1 };
    if (req.query.sortBy === 'stock_low') sortObj = { available: 1, stock: 1 };

    // Fetch products and total count
    const total = await Product.countDocuments(query);
    const dbCategories = await Product.distinct('category');
    // Ensure all predefined ERP categories are merged
    const categories = Array.from(new Set([...PRODUCT_CATEGORIES, ...dbCategories]));

    if (req.query.all === 'true' || req.query.limit === 'all' || parseInt(req.query.limit, 10) >= 1000) {
      const products = await Product.find(query).sort(sortObj);
      return res.status(200).json({
        products,
        categories,
        allCategories: PRODUCT_CATEGORIES,
        page: 1,
        pages: 1,
        totalProducts: total,
      });
    }

    const products = await Product.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      products,
      categories,
      allCategories: PRODUCT_CATEGORIES,
      page,
      pages: Math.ceil(total / limit) || 1,
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
    let { name, SKU, category, price, description, stock, reorderLevel } = req.body;

    // Auto-generate unique SKU if not provided or empty
    if (!SKU || typeof SKU !== 'string' || SKU.trim() === '') {
      const prefixMap = {
        'Grocery': 'GROC',
        'Dairy': 'DAIR',
        'Packaged Food': 'PACK',
        'Beverages': 'BEV',
        'Personal Care': 'PERS',
        'Household': 'HOUS',
        'Fashion': 'FASH',
        'Electronics': 'ELEC',
        'Pharmacy': 'PHAR',
        'Office Supplies': 'OFFC',
        'Hardware & Tools': 'TOOL',
        'Home & Kitchen': 'HOME',
        'Industrial': 'INDU',
        'Raw Materials': 'RAWM',
        'Valves': 'VALV',
        'Pipes': 'PIPE',
        'Machinery': 'MACH',
        'Chemicals': 'CHEM',
        'Automotive': 'AUTO',
        'Packaging': 'PACK',
      };
      const prefix = prefixMap[category] || (category ? category.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '') : 'PROD');
      let candidateSKU = '';
      for (let attempt = 0; attempt < 20; attempt++) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        candidateSKU = `${prefix}-${rand}`;
        const exists = await Product.findOne({ SKU: candidateSKU });
        if (!exists) break;
      }
      SKU = candidateSKU || `${prefix}-${Date.now().toString().slice(-4)}`;
    } else {
      SKU = SKU.trim().toUpperCase();
      const skuExists = await Product.findOne({ SKU });
      if (skuExists) {
        return res.status(400).json({ message: 'Product with this SKU already exists' });
      }
    }

    const numStock = parseInt(stock, 10) || 0;
    const product = await Product.create({
      name: name?.trim(),
      SKU,
      category,
      price: parseFloat(price) || 0,
      description,
      stock: numStock,
      onHand: numStock,
      reserved: 0,
      available: numStock,
      reorderLevel: parseInt(reorderLevel, 10) || 10,
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
