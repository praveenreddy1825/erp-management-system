import mongoose from 'mongoose';
import SalesOrder from '../models/SalesOrder.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Contact from '../models/Contact.js';
import User from '../models/User.js';
import { runTransaction } from '../utils/transactionHelper.js';

// Valid status transitions state machine for Sales Orders
const VALID_STATUS_TRANSITIONS = {
  Pending: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [], // Terminal status
  Cancelled: [], // Terminal status
};

// @desc    Create a new Sales Order
// @route   POST /api/sales-orders
// @access  Private (Admin, Sales_Manager, Customer)
export const createSalesOrder = async (req, res) => {
  try {
    const { customer, products, remarks, paymentStatus } = req.body;

    // 1. Validate customer existence
    if (!customer) {
      return res.status(400).json({ message: 'Customer ID is required' });
    }

    const customerExists = await Customer.findById(customer);
    if (!customerExists) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Customer role RBAC check: Customers can only create orders for their own account
    if (req.user && req.user.role === 'Customer') {
      const contact = await Contact.findOne({ email: req.user.email });
      const customerDoc = await Customer.findOne({ contactInfo: contact?._id });
      if (!customerDoc || customer !== customerDoc._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to create Sales Orders for other customers' });
      }
    }

    // 2. Validate products input
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Sales Order must contain at least one product line item' });
    }

    const finalProducts = [];
    let calculatedTotal = 0;

    for (const item of products) {
      if (!item.product) {
        return res.status(400).json({ message: 'Each order item must specify a valid product ID' });
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ message: 'Product quantities must be positive integers greater than 0' });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found with ID ${item.product}` });
      }

      if (product.stock < qty) {
        return res.status(400).json({
          message: `Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${qty}`,
        });
      }

      // Lock price server-side from canonical database catalog
      finalProducts.push({
        product: product._id,
        quantity: qty,
        price: product.price,
      });
      calculatedTotal += qty * product.price;
    }

    // 3. Create order and deduct stock (with transaction if replica set/Atlas, or direct if standalone)
    let createdOrderId = null;
    await runTransaction(async (session) => {
      const opts = session ? { session, new: true } : { new: true };
      const createOpts = session ? { session } : {};

      // Step A: Atomically deduct stock using concurrency guard ($gte)
      for (const item of finalProducts) {
        const updated = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          opts
        );

        if (!updated) {
          throw new Error(`Concurrency conflict: insufficient stock during checkout for product ID ${item.product}`);
        }
      }

      // Step B: Insert Sales Order record
      const [order] = await SalesOrder.create(
        [
          {
            customer,
            products: finalProducts,
            TotalAmount: calculatedTotal,
            status: 'Pending',
            paymentStatus: paymentStatus || 'unpaid',
            remarks,
            createdBy: req.user._id,
          },
        ],
        createOpts
      );
      createdOrderId = order._id;
    });

    // 4. Return populated order
    const populatedOrder = await SalesOrder.findById(createdOrderId)
      .populate('customer')
      .populate('products.product')
      .populate('createdBy', 'name email');

    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('Error creating sales order:', error);
    res.status(500).json({ message: error.message || 'Failed to create Sales Order' });
  }
};

// @desc    Get all Sales Orders (with Pagination and Population)
// @route   GET /api/sales-orders
// @access  Private
export const getSalesOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    if (req.user.role === 'Customer') {
      const contact = await Contact.findOne({ email: req.user.email });
      const customer = await Customer.findOne({ contactInfo: contact?._id });
      if (customer) {
        filter.customer = customer._id;
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

    const total = await SalesOrder.countDocuments(filter);
    const orders = await SalesOrder.find(filter)
      .populate('customer')
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

// @desc    Get single Sales Order by ID
// @route   GET /api/sales-orders/:id
// @access  Private
export const getSalesOrderById = async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id)
      .populate('customer')
      .populate('products.product')
      .populate('createdBy', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Sales Order not found' });
    }

    // Access check: Customers can only view their own sales orders
    if (req.user.role === 'Customer') {
      const contact = await Contact.findOne({ email: req.user.email });
      const customer = await Customer.findOne({ contactInfo: contact?._id });
      if (!customer || order.customer._id.toString() !== customer._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this Sales Order' });
      }
    }
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Sales Order status with state-machine validation
// @route   PUT /api/sales-orders/:id/status
// @access  Private (Admin, Sales_Manager)
export const updateSalesOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const order = await SalesOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Sales Order not found' });
    }

    // Validate status transition if status is being updated
    if (status && status !== order.status) {
      const allowedNextStates = VALID_STATUS_TRANSITIONS[order.status] || [];
      if (!allowedNextStates.includes(status)) {
        return res.status(400).json({
          message: `Invalid status transition from "${order.status}" to "${status}". Allowed transitions: [${allowedNextStates.join(', ') || 'None (Terminal state)'}]`,
        });
      }

      await runTransaction(async (session) => {
        // If order is transitioning to Cancelled, atomically restore warehouse stock
        if (status === 'Cancelled') {
          const opts = session ? { session } : {};
          for (const item of order.products) {
            await Product.findByIdAndUpdate(
              item.product,
              { $inc: { stock: item.quantity } },
              opts
            );
          }
        }

        order.status = status;
        if (paymentStatus) {
          order.paymentStatus = paymentStatus;
        }
        await (session ? order.save({ session }) : order.save());
      });
    } else if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      await order.save();
    }

    const updatedOrder = await SalesOrder.findById(order._id)
      .populate('customer')
      .populate('products.product')
      .populate('createdBy', 'name email');

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error updating sales order status:', error);
    res.status(500).json({ message: error.message || 'Failed to update sales order status' });
  }
};

// @desc    Cancel a Sales Order (Restores Stock back to warehouse)
// @route   PUT /api/sales-orders/:id/cancel
// @access  Private (Admin, Sales_Manager, Customer)
export const cancelSalesOrder = async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Sales Order not found' });
    }

    // Verify Customer matches logged in user's profile for cancellations
    if (req.user && req.user.role === 'Customer') {
      const contact = await Contact.findOne({ email: req.user.email });
      const customerDoc = await Customer.findOne({ contactInfo: contact?._id });
      if (!customerDoc || order.customer.toString() !== customerDoc._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to cancel this Sales Order' });
      }
    }

    if (order.status === 'Cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    if (order.status === 'Delivered') {
      return res.status(400).json({ message: 'Cannot cancel an order that has already been delivered' });
    }

    await runTransaction(async (session) => {
      const opts = session ? { session } : {};
      // Restore stock quantities back to Product collection
      for (const item of order.products) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } },
          opts
        );
      }

      order.status = 'Cancelled';
      await (session ? order.save({ session }) : order.save());
    });

    res.status(200).json({ message: 'Sales Order cancelled successfully, stock restored', order });
  } catch (error) {
    console.error('Error cancelling sales order:', error);
    res.status(500).json({ message: error.message || 'Failed to cancel sales order' });
  }
};
