import mongoose from 'mongoose';
import SalesOrder from '../models/SalesOrder.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Contact from '../models/Contact.js';
import User from '../models/User.js';
import { runTransaction } from '../utils/transactionHelper.js';
import {
  reserveStockForOrder,
  releaseOrderReservation,
  fulfillOrderStock,
} from '../utils/inventoryHelper.js';

// Enterprise State Machine for Sales Orders
export const VALID_STATUS_TRANSITIONS = {
  Pending: ['Confirmed', 'Processing', 'Cancelled', 'Rejected'],
  Confirmed: ['Processing', 'Cancelled', 'Rejected'],
  Processing: ['Fulfilled', 'Delivered', 'Cancelled'],
  Fulfilled: [],  // Terminal fulfilled status
  Delivered: [],  // Terminal fulfilled status (backward compatible)
  Cancelled: [],  // Terminal status
  Rejected: [],   // Terminal status
};

// Unique SO Number Generator
const generateUniqueSONumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  for (let i = 0; i < 10; i++) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const candidate = `SO-${dateStr}-${rand}`;
    const exists = await SalesOrder.findOne({ soNumber: candidate });
    if (!exists) return candidate;
  }
  return `SO-${dateStr}-${Date.now().toString().slice(-4)}`;
};

// @desc    Create a new Customer Sales Order & Reserve Stock Atomically
// @route   POST /api/sales-orders
// @access  Private (Admin, Sales_Manager, Customer)
export const createSalesOrder = async (req, res) => {
  try {
    const { customer, products, items, remarks, paymentStatus } = req.body;
    const productsList = products || items;

    // 1. Validate customer existence & ownership
    if (!customer) {
      return res.status(400).json({ message: 'Customer ID is required' });
    }

    const customerExists = await Customer.findById(customer);
    if (!customerExists) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (req.user && req.user.role === 'Customer') {
      const contact = await Contact.findOne({ email: req.user.email });
      const customerDoc = await Customer.findOne({ contactInfo: contact?._id });
      if (!customerDoc || customer !== customerDoc._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to create Sales Orders for other customers' });
      }
    }

    // 2. Validate line items
    if (!productsList || !Array.isArray(productsList) || productsList.length === 0) {
      return res.status(400).json({ message: 'Sales Order must contain at least one product line item' });
    }

    const finalProducts = [];
    let calculatedTotal = 0;

    for (const item of productsList) {
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

      // Check available stock (invariant: available = onHand - reserved)
      const availableStock = typeof product.available === 'number' ? product.available : product.stock;
      if (availableStock < qty) {
        return res.status(400).json({
          message: `Insufficient available stock for product "${product.name}". Available: ${availableStock}, Requested: ${qty}. Please wait for stock replenishment.`,
        });
      }

      finalProducts.push({
        product: product._id,
        quantity: qty,
        price: product.price,
      });
      calculatedTotal += qty * product.price;
    }

    const soNumber = await generateUniqueSONumber();
    let createdOrderId = null;

    // 3. Atomically reserve stock & create Sales Order
    await runTransaction(async (session) => {
      const createOpts = session ? { session } : {};

      const [order] = await SalesOrder.create(
        [
          {
            soNumber,
            customer,
            products: finalProducts,
            TotalAmount: calculatedTotal,
            status: 'Pending',
            reservationStatus: 'Reserved',
            paymentStatus: paymentStatus || 'unpaid',
            remarks,
            createdBy: req.user._id,
            statusHistory: [
              {
                fromStatus: 'None',
                toStatus: 'Pending',
                changedBy: req.user._id,
                changedAt: new Date(),
                notes: 'Order placed by customer; stock allocated to reservation',
              },
            ],
          },
        ],
        createOpts
      );
      createdOrderId = order._id;

      // Reserve stock atomically and write to StockMovement ledger
      await reserveStockForOrder({
        lineItems: finalProducts,
        sourceDocument: soNumber,
        sourceDocumentId: order._id,
        actor: req.user._id,
        session,
      });
    });

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

// @desc    Get all Sales Orders (with Filtering & Pagination)
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

    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.search) {
      const s = req.query.search.trim();
      filter.$or = [{ soNumber: { $regex: s, $options: 'i' } }, { remarks: { $regex: s, $options: 'i' } }];
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
      pages: Math.ceil(total / limit) || 1,
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
      .populate('createdBy', 'name email')
      .populate('statusHistory.changedBy', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Sales Order not found' });
    }

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

// @desc    Update Sales Order status with strict state machine and stock fulfillment
// @route   PUT /api/sales-orders/:id/status
// @access  Private (Admin, Sales_Manager, Customer for eligible cancellations)
export const updateSalesOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus, reason, notes } = req.body;
    const order = await SalesOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Sales Order not found' });
    }

    // Role-based cancellation check: Customers can only cancel while status is Pending
    if (req.user.role === 'Customer') {
      if (status !== 'Cancelled') {
        return res.status(403).json({ message: 'Customers can only cancel pending orders' });
      }
      if (order.status !== 'Pending') {
        return res.status(400).json({
          message: `Orders in "${order.status}" status cannot be cancelled by customers. Contact sales support.`,
        });
      }
    }

    // State machine validation
    if (status && status !== order.status) {
      const allowedNext = VALID_STATUS_TRANSITIONS[order.status] || [];
      if (!allowedNext.includes(status)) {
        return res.status(400).json({
          message: `Invalid status transition from "${order.status}" to "${status}". Allowed: [${allowedNext.join(', ') || 'Terminal state'}]`,
        });
      }

      await runTransaction(async (session) => {
        // Case A: FULFILLMENT (Fulfilled or Delivered)
        if (status === 'Fulfilled' || status === 'Delivered') {
          if (['Fulfilled', 'Delivered'].includes(order.status)) {
            throw new Error('This order has already been fulfilled.');
          }

          if (order.reservationStatus !== 'Reserved') {
            throw new Error(`Cannot fulfill order with reservation status "${order.reservationStatus}".`);
          }

          // Atomically deduct onHand stock, release reservation, and record StockMovement
          await fulfillOrderStock({
            lineItems: order.products,
            sourceDocument: order.soNumber || order._id.toString(),
            sourceDocumentId: order._id,
            actor: req.user._id,
            session,
          });

          order.reservationStatus = 'Fulfilled';
        }

        // Case B: CANCELLATION or REJECTION (Release reservation)
        if (status === 'Cancelled' || status === 'Rejected') {
          if (['Fulfilled', 'Delivered'].includes(order.status)) {
            throw new Error('Cannot cancel an order that has already been fulfilled.');
          }

          if (order.reservationStatus === 'Reserved') {
            // Release reservation and log StockMovement
            await releaseOrderReservation({
              lineItems: order.products,
              sourceDocument: order.soNumber || order._id.toString(),
              sourceDocumentId: order._id,
              actor: req.user._id,
              reason: reason || notes || `Order ${status.toLowerCase()}`,
              session,
            });

            order.reservationStatus = 'Released';
          }

          if (status === 'Cancelled') order.cancellationReason = reason || notes;
          if (status === 'Rejected') order.rejectionReason = reason || notes;
        }

        order.statusHistory.push({
          fromStatus: order.status,
          toStatus: status,
          changedBy: req.user._id,
          changedAt: new Date(),
          notes: notes || reason || `Order transitioned to ${status}`,
        });

        order.status = status;
        if (paymentStatus) order.paymentStatus = paymentStatus;

        await order.save({ session });
      });
    } else if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      await order.save();
    }

    const updated = await SalesOrder.findById(order._id)
      .populate('customer')
      .populate('products.product')
      .populate('createdBy', 'name email');

    res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating sales order status:', error);
    res.status(500).json({ message: error.message || 'Failed to update Sales Order status' });
  }
};

// @desc    Customer or Manager cancels a Sales Order
// @route   PUT /api/sales-orders/:id/cancel
// @access  Private (Admin, Sales_Manager, Customer)
export const cancelSalesOrder = async (req, res) => {
  req.body.status = 'Cancelled';
  return updateSalesOrderStatus(req, res);
};
