import PurchaseOrder from '../models/PurchaseOrder.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import Contact from '../models/Contact.js';

// @desc    Create a new Purchase Order
// @route   POST /api/purchase-orders
// @access  Private (Admin, Purchase_Manager)
export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier, products, remarks } = req.body;

    // 1. Verify supplier exists
    const supplierExists = await Supplier.findById(supplier);
    if (!supplierExists) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // 2. Validate products and cost prices
    const finalProducts = [];
    for (const item of products) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({ message: `Product not found with ID ${item.product}` });
      }

      finalProducts.push({
        product: item.product,
        quantity: item.quantity,
        price: item.price, // Stored supplier cost price (negotiated)
      });
    }

    // 3. Create the Purchase Order
    const purchaseOrder = await PurchaseOrder.create({
      supplier,
      products: finalProducts,
      remarks,
      createdBy: req.user._id, // Attached by protect middleware
    });

    const populatedOrder = await PurchaseOrder.findById(purchaseOrder._id)
      .populate('supplier')
      .populate('products.product')
      .populate('createdBy', 'name email');

    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all Purchase Orders (with Pagination)
// @route   GET /api/purchase-orders
// @access  Private
export const getPurchaseOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    if (req.user.role === 'Supplier') {
      const contact = await Contact.findOne({ email: req.user.email });
      const supplier = await Supplier.findOne({ contactInfo: contact?._id });
      if (supplier) {
        filter.supplier = supplier._id;
      } else {
        return res.status(200).json({
          orders: [],
          page: 1,
          pages: 0,
          totalOrders: 0,
        });
      }
    }

    const total = await PurchaseOrder.countDocuments(filter);
    const orders = await PurchaseOrder.find(filter)
      .populate('supplier')
      .populate('products.product')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      orders,
      page,
      pages: Math.ceil(total / limit),
      totalOrders: total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single Purchase Order by ID
// @route   GET /api/purchase-orders/:id
// @access  Private
export const getPurchaseOrderById = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier')
      .populate('products.product')
      .populate('createdBy', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    // Access check: Suppliers can only view their own POs
    if (req.user.role === 'Supplier') {
      const contact = await Contact.findOne({ email: req.user.email });
      const supplier = await Supplier.findOne({ contactInfo: contact?._id });
      if (!supplier || order.supplier._id.toString() !== supplier._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this Purchase Order' });
      }
    }
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Purchase Order status
// @route   PUT /api/purchase-orders/:id/status
// @access  Private (Admin, Purchase_Manager)
export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    // Access check: Suppliers can only update status of their own POs
    if (req.user.role === 'Supplier') {
      const contact = await Contact.findOne({ email: req.user.email });
      const supplier = await Supplier.findOne({ contactInfo: contact?._id });
      if (!supplier || order.supplier.toString() !== supplier._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this Purchase Order' });
      }
    }

    // Validate that the status transition matches schema-compatible enums
    const allowedStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    order.status = status;
    await order.save();

    const updatedOrder = await PurchaseOrder.findById(order._id)
      .populate('supplier')
      .populate('products.product')
      .populate('createdBy', 'name email');

    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
