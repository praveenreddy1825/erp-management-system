import mongoose from 'mongoose';
import SalesOrder from '../models/SalesOrder.js';
import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Contact from '../models/Contact.js';
import Cart from '../models/Cart.js';
import Idempotency from '../models/Idempotency.js';
import { runTransaction } from '../utils/transactionHelper.js';
import {
  reserveStockForOrder,
  releaseOrderReservation,
  fulfillOrderStock,
} from '../utils/inventoryHelper.js';

// Streamlined State Machine for Sales Orders
export const VALID_STATUS_TRANSITIONS = {
  Pending: ['Confirmed', 'Processing', 'Delivered', 'Cancelled', 'Rejected'],
  Confirmed: ['Processing', 'Delivered', 'Cancelled', 'Rejected'],
  Processing: ['Delivered', 'Fulfilled', 'Shipped', 'Cancelled'],
  Shipped: ['Delivered', 'Fulfilled', 'Cancelled'],
  Fulfilled: [],  // Terminal fulfilled status
  Delivered: [],  // Terminal fulfilled status
  Cancelled: [],  // Terminal status
  Rejected: [],   // Terminal status
};

// Unique SO Number Generator with higher entropy
const generateUniqueSONumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  for (let i = 0; i < 15; i++) {
    const rand = Math.floor(100000 + Math.random() * 900000);
    const candidate = `SO-${dateStr}-${rand}`;
    const exists = await SalesOrder.findOne({ soNumber: candidate });
    if (!exists) return candidate;
  }
  return `SO-${dateStr}-${Date.now().toString().slice(-6)}`;
};

// @desc    Create a new Customer Sales Order & Reserve Stock Atomically with Idempotency
// @route   POST /api/sales-orders
// @access  Private (Admin, Sales_Manager, Customer)
export const createSalesOrder = async (req, res) => {
  const idempotencyKey = (req.headers['idempotency-key'] || req.body.idempotencyKey)?.toString()?.trim();
  let idempotencyRecord = null;

  try {
    // 1. Durable Idempotency Check
    if (idempotencyKey) {
      try {
        idempotencyRecord = await Idempotency.create({
          key: idempotencyKey,
          user: req.user._id,
          endpoint: 'POST /api/sales-orders',
          status: 'IN_PROGRESS',
        });
      } catch (idempErr) {
        if (idempErr.code === 11000) {
          // Duplicate key: an identical idempotency key is already stored
          for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            const existing = await Idempotency.findOne({ key: idempotencyKey, user: req.user._id });
            if (existing && existing.status === 'COMPLETED') {
              return res.status(existing.responseCode || 201).json(existing.responseBody);
            }
            if (existing && existing.status === 'FAILED') {
              return res.status(existing.responseCode || 400).json(
                existing.responseBody || { message: 'Previous checkout attempt failed' }
              );
            }
          }
          return res.status(409).json({ message: 'A checkout request with this idempotency key is already in progress' });
        }
        throw idempErr;
      }
    }

    const { customer, products, items, remarks, paymentStatus } = req.body;
    let productsList = products || items;

    // If no items provided in body, check if customer has a backend cart with items
    if ((!productsList || productsList.length === 0) && req.user.role === 'Customer') {
      const activeCart = await Cart.findOne({ user: req.user._id });
      if (activeCart && activeCart.items && activeCart.items.length > 0) {
        productsList = activeCart.items;
      }
    }

    // 2. Validate customer existence & ownership (auto-resolves for Customer role)
    let customerDoc = null;
    if (req.user && req.user.role === 'Customer') {
      let contact = await Contact.findOne({ email: req.user.email.toLowerCase().trim() });
      if (contact) {
        customerDoc = await Customer.findOne({ contactInfo: contact._id });
      }
      if (!customerDoc) {
        if (!contact) {
          contact = await Contact.create({
            email: req.user.email.toLowerCase().trim(),
            phone_number: req.user.phone_number || '+910000000000',
            address: { street: 'No details' },
          });
        }
        customerDoc = await Customer.create({
          name: req.user.name,
          contactInfo: contact._id,
        });
      }
    } else if (customer) {
      customerDoc = await Customer.findById(customer);
    }

    if (!customerDoc) {
      const errMsg = 'Customer ID or authenticated customer profile is required';
      if (idempotencyRecord) {
        await Idempotency.findByIdAndUpdate(idempotencyRecord._id, { status: 'FAILED', responseCode: 400, responseBody: { message: errMsg } });
      }
      return res.status(400).json({ message: errMsg });
    }

    // 3. Validate line items
    if (!productsList || !Array.isArray(productsList) || productsList.length === 0) {
      const errMsg = 'Sales Order must contain at least one product line item';
      if (idempotencyRecord) {
        await Idempotency.findByIdAndUpdate(idempotencyRecord._id, { status: 'FAILED', responseCode: 400, responseBody: { message: errMsg } });
      }
      return res.status(400).json({ message: errMsg });
    }

    // Consolidate duplicate items in cart to prevent redundant line entries
    const mergedMap = new Map();
    for (const item of productsList) {
      const rawProdId = item.product?._id || item.product;
      if (!rawProdId) {
        const errMsg = 'Each order item must specify a valid product ID';
        if (idempotencyRecord) {
          await Idempotency.findByIdAndUpdate(idempotencyRecord._id, { status: 'FAILED', responseCode: 400, responseBody: { message: errMsg } });
        }
        return res.status(400).json({ message: errMsg });
      }
      const prodIdStr = String(rawProdId);
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        const errMsg = 'Product quantities must be positive integers greater than 0';
        if (idempotencyRecord) {
          await Idempotency.findByIdAndUpdate(idempotencyRecord._id, { status: 'FAILED', responseCode: 400, responseBody: { message: errMsg } });
        }
        return res.status(400).json({ message: errMsg });
      }
      if (qty > 1000) {
        const errMsg = 'Quantity cannot exceed 1000 units per line item';
        if (idempotencyRecord) {
          await Idempotency.findByIdAndUpdate(idempotencyRecord._id, { status: 'FAILED', responseCode: 400, responseBody: { message: errMsg } });
        }
        return res.status(400).json({ message: errMsg });
      }
      mergedMap.set(prodIdStr, (mergedMap.get(prodIdStr) || 0) + qty);
    }

    const finalProducts = [];
    let calculatedTotal = 0;

    for (const [prodIdStr, totalQty] of mergedMap.entries()) {
      const product = await Product.findById(prodIdStr);
      if (!product) {
        const errMsg = `Product not found with ID ${prodIdStr}`;
        if (idempotencyRecord) {
          await Idempotency.findByIdAndUpdate(idempotencyRecord._id, { status: 'FAILED', responseCode: 404, responseBody: { message: errMsg } });
        }
        return res.status(404).json({ message: errMsg });
      }

      const availableStock = typeof product.available === 'number' ? product.available : product.stock;
      if (availableStock < totalQty) {
        const errMsg = `Insufficient available stock for product "${product.name}". Available: ${availableStock}, Requested: ${totalQty}. Please wait for stock replenishment.`;
        if (idempotencyRecord) {
          await Idempotency.findByIdAndUpdate(idempotencyRecord._id, { status: 'FAILED', responseCode: 400, responseBody: { message: errMsg } });
        }
        return res.status(400).json({ message: errMsg });
      }

      // Authoritative server-side price calculation
      const authPrice = typeof product.price === 'number' ? product.price : 0;
      finalProducts.push({
        product: product._id,
        quantity: totalQty,
        price: authPrice,
      });
      calculatedTotal += totalQty * authPrice;
    }

    // Role-based payment status lockdown: Customers can never mark their own order as Paid at checkout
    let finalPaymentStatus = 'unpaid';
    if (req.user.role !== 'Customer' && paymentStatus) {
      finalPaymentStatus = paymentStatus;
    }

    const soNumber = await generateUniqueSONumber();
    const orderId = new mongoose.Types.ObjectId();
    let createdOrderId = null;

    // 4. Atomically reserve stock & create Sales Order
    await runTransaction(async (session) => {
      const createOpts = session ? { session } : {};

      // Step A: Reserve stock atomically with conditional updates & deadlock prevention
      await reserveStockForOrder({
        lineItems: finalProducts,
        sourceDocument: soNumber,
        sourceDocumentId: orderId,
        actor: req.user._id,
        session,
      });

      // Step B: Create SalesOrder document
      try {
        const [order] = await SalesOrder.create(
          [
            {
              _id: orderId,
              soNumber,
              customer: customerDoc._id,
              products: finalProducts,
              TotalAmount: Number(calculatedTotal.toFixed(2)),
              status: 'Pending',
              reservationStatus: 'Reserved',
              paymentStatus: finalPaymentStatus,
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
      } catch (orderCreateErr) {
        // If order document creation fails and running on standalone MongoDB, release reservation immediately
        if (!session) {
          await releaseOrderReservation({
            lineItems: finalProducts,
            sourceDocument: soNumber,
            sourceDocumentId: orderId,
            actor: req.user._id,
            reason: 'Rollback due to order creation failure',
          });
        }
        throw orderCreateErr;
      }
    });

    const populatedOrder = await SalesOrder.findById(createdOrderId)
      .populate('customer')
      .populate('products.product')
      .populate('createdBy', 'name email');

    // 5. Post-Checkout Cart Cleanup: Clear authenticated customer's backend cart
    if (req.user.role === 'Customer') {
      try {
        await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [] } });
      } catch (cartClearErr) {
        console.error('Failed to clear customer cart after order:', cartClearErr);
      }
    }

    // 6. Record Completed Idempotency Record
    if (idempotencyRecord) {
      await Idempotency.findByIdAndUpdate(idempotencyRecord._id, {
        status: 'COMPLETED',
        responseCode: 201,
        responseBody: populatedOrder,
        orderId: createdOrderId,
      });
    }

    res.status(201).json(populatedOrder);
  } catch (error) {
    if (idempotencyRecord) {
      await Idempotency.findByIdAndUpdate(idempotencyRecord._id, {
        status: 'FAILED',
        responseCode: 400,
        responseBody: { message: error.message },
      });
    }
    console.error('Error creating sales order:', error);
    res.status(400).json({ message: error.message || 'Failed to create Sales Order' });
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
      const emailPattern = new RegExp(`^${req.user.email.trim()}$`, 'i');
      const contact = await Contact.findOne({ email: { $regex: emailPattern } });
      const customer = contact ? await Customer.findOne({ contactInfo: contact._id }) : null;

      const customerConditions = [{ createdBy: req.user._id }];
      if (customer) {
        customerConditions.push({ customer: customer._id });
      }
      filter.$or = customerConditions;
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
      const isCreator = order.createdBy?._id?.toString() === req.user._id.toString();
      let isLinkedCustomer = false;
      const contact = await Contact.findOne({ email: req.user.email.toLowerCase().trim() });
      if (contact) {
        const customer = await Customer.findOne({ contactInfo: contact._id });
        if (customer && order.customer?._id?.toString() === customer._id.toString()) {
          isLinkedCustomer = true;
        }
      }
      if (!isCreator && !isLinkedCustomer) {
        return res.status(403).json({ message: 'Not authorized to view this Sales Order' });
      }
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Sales Order status with strict state machine and atomic stock fulfillment
// @route   PUT /api/sales-orders/:id/status
// @access  Private (Admin, Sales_Manager, Customer for eligible cancellations)
export const updateSalesOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus, reason, notes } = req.body;
    const order = await SalesOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Sales Order not found' });
    }

    // Role-based authorization & ownership check for cancellations
    if (req.user.role === 'Customer') {
      if (status !== 'Cancelled') {
        return res.status(403).json({ message: 'Customers can only cancel pending orders' });
      }

      // Check order ownership
      const isCreator = order.createdBy?.toString() === req.user._id.toString();
      let isLinkedCustomer = false;
      const contact = await Contact.findOne({ email: req.user.email.toLowerCase().trim() });
      if (contact) {
        const customer = await Customer.findOne({ contactInfo: contact._id });
        if (customer && order.customer?.toString() === customer._id.toString()) {
          isLinkedCustomer = true;
        }
      }

      if (!isCreator && !isLinkedCustomer) {
        return res.status(403).json({ message: 'Forbidden: You are not authorized to cancel this order' });
      }

      if (order.status !== 'Pending') {
        return res.status(400).json({
          message: `Orders in "${order.status}" status cannot be cancelled by customers. Contact sales support.`,
        });
      }
    }

    // Guard: Do not allow marking a cancelled or rejected order as Paid
    if (paymentStatus === 'Paid' && ['Cancelled', 'Rejected'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot mark a cancelled or rejected sales order as paid' });
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
        if (paymentStatus && !['Cancelled', 'Rejected'].includes(status)) {
          order.paymentStatus = paymentStatus;
        }

        await (session ? order.save({ session }) : order.save());
      });
    } else if (paymentStatus) {
      if (['Cancelled', 'Rejected'].includes(order.status) && paymentStatus === 'Paid') {
        return res.status(400).json({ message: 'Cannot mark a cancelled or rejected sales order as paid' });
      }
      order.paymentStatus = paymentStatus;
      await order.save();
    }

    // Two-way synchronization: update linked invoice payment status if it exists
    if (paymentStatus) {
      if (paymentStatus === 'Paid') {
        await Invoice.findOneAndUpdate(
          { salesOrder: order._id, paymentStatus: 'Unpaid' },
          {
            $set: {
              paymentStatus: 'Paid',
              paidAmount: order.TotalAmount,
              paidDate: new Date(),
              paymentMethod: 'Direct Payment / Sales Order',
              recordedBy: req.user._id,
            },
          }
        );
      } else if (paymentStatus.toLowerCase() === 'unpaid') {
        await Invoice.findOneAndUpdate(
          { salesOrder: order._id, paymentStatus: 'Paid' },
          {
            $set: {
              paymentStatus: 'Unpaid',
              paidAmount: 0,
              paidDate: null,
              paymentMethod: null,
            },
          }
        );
      }
    }

    const updated = await SalesOrder.findById(order._id)
      .populate('customer')
      .populate('products.product')
      .populate('createdBy', 'name email');

    res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating sales order status:', error);
    res.status(400).json({ message: error.message || 'Failed to update Sales Order status' });
  }
};

// @desc    Customer or Manager cancels a Sales Order
// @route   PUT /api/sales-orders/:id/cancel
// @access  Private (Admin, Sales_Manager, Customer)
export const cancelSalesOrder = async (req, res) => {
  req.body.status = 'Cancelled';
  return updateSalesOrderStatus(req, res);
};
