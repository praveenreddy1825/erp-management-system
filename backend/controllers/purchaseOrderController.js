import PurchaseOrder from '../models/PurchaseOrder.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import Contact from '../models/Contact.js';
import User from '../models/User.js';

// Valid status transitions state machine for Purchase Orders
const VALID_PO_TRANSITIONS = {
  Pending: ['Processing', 'Shipped', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered', 'Cancelled'],
  Delivered: [], // Terminal status
  Cancelled: [], // Terminal status
};

// @desc    Create a new Purchase Order
// @route   POST /api/purchase-orders
// @access  Private (Admin, Purchase_Manager)
export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier, products, remarks, paymentStatus } = req.body;

    // 1. Verify supplier input
    if (!supplier) {
      return res.status(400).json({ message: 'Supplier ID is required' });
    }

    const supplierExists = await Supplier.findById(supplier);
    if (!supplierExists) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // 2. Validate products array
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Purchase Order must contain at least one product item' });
    }

    const finalProducts = [];
    let calculatedTotal = 0;

    for (const item of products) {
      if (!item.product) {
        return res.status(400).json({ message: 'Each item must specify a valid product ID' });
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ message: 'Quantity must be a positive integer greater than 0' });
      }

      const price = parseFloat(item.price);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ message: 'Price must be a valid non-negative number' });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found with ID ${item.product}` });
      }

      finalProducts.push({
        product: product._id,
        quantity: qty,
        price: price,
      });
      calculatedTotal += qty * price;
    }

    // 3. Create the Purchase Order
    const purchaseOrder = await PurchaseOrder.create({
      supplier,
      products: finalProducts,
      TotalAmount: calculatedTotal,
      status: 'Pending',
      paymentStatus: paymentStatus || 'unpaid',
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

// @desc    Get all Purchase Orders (with Pagination & Filtering)
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

    if (req.query.status) {
      filter.status = req.query.status;
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

// @desc    Update Purchase Order status with State-Machine Validation
// @route   PUT /api/purchase-orders/:id/status
// @access  Private (Admin, Purchase_Manager, Supplier)
export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
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

      // Suppliers can only transition an order to 'Shipped'
      if (status && status !== 'Shipped') {
        return res.status(403).json({ message: 'Suppliers may only transition orders to "Shipped" status' });
      }
    }

    // State machine validation
    if (status && status !== order.status) {
      const allowedNextStates = VALID_PO_TRANSITIONS[order.status] || [];
      if (!allowedNextStates.includes(status)) {
        return res.status(400).json({
          message: `Invalid status transition from "${order.status}" to "${status}". Allowed transitions: [${allowedNextStates.join(', ') || 'None (Terminal state)'}]`,
        });
      }
      order.status = status;
    }

    if (paymentStatus && ['Admin', 'Purchase_Manager'].includes(req.user.role)) {
      order.paymentStatus = paymentStatus;
    }

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
