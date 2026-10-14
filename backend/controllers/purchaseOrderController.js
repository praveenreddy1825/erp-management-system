import PurchaseOrder from '../models/PurchaseOrder.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import GRN from '../models/GRN.js';

// Enterprise State Machine for Purchase Orders
export const VALID_PO_TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Cancelled'], // Delivered & Partially_Received are reached via GRN
  Partially_Received: [], // Only reached/advanced via GRN
  Delivered: [],          // Terminal state
  Cancelled: [],          // Terminal state
};

// Generate unique PO Number safely
const generateUniquePONumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  for (let attempt = 0; attempt < 10; attempt++) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const candidate = `PO-${dateStr}-${rand}`;
    const exists = await PurchaseOrder.findOne({ poNumber: candidate });
    if (!exists) return candidate;
  }
  return `PO-${dateStr}-${Date.now().toString().slice(-4)}`;
};

// @desc    Create a new Purchase Order
// @route   POST /api/purchase-orders
// @access  Private (Admin, Purchase_Manager)
export const createPurchaseOrder = async (req, res) => {
  try {
    const {
      supplier: supplierId,
      products,
      items,
      remarks,
      notes,
      paymentStatus,
      paymentTerms,
      expectedDeliveryDate,
    } = req.body;

    // Support both 'products' and 'items' property names
    const productsList = products || items;

    // 1. Validate Supplier
    if (!supplierId) {
      return res.status(400).json({ message: 'Supplier ID is required' });
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    if (supplier.isActive === false) {
      return res.status(400).json({ message: 'Cannot create Purchase Order for an inactive or deactivated supplier' });
    }

    // 2. Validate Products array
    if (!productsList || !Array.isArray(productsList) || productsList.length === 0) {
      return res.status(400).json({ message: 'Purchase Order must contain at least one product line item' });
    }

    const lineItems = [];
    let serverTotal = 0;

    for (const item of productsList) {
      if (!item.product) {
        return res.status(400).json({ message: 'Each item must specify a valid product ID' });
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ message: 'Item quantity must be a positive integer greater than 0' });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found with ID ${item.product}` });
      }

      // Lock price: support price or purchasePrice, else default to product catalog price
      let unitPrice = item.price !== undefined 
        ? parseFloat(item.price) 
        : (item.purchasePrice !== undefined ? parseFloat(item.purchasePrice) : product.price);

      if (isNaN(unitPrice) || unitPrice < 0) {
        return res.status(400).json({ message: `Invalid unit price for product "${product.name}"` });
      }

      lineItems.push({
        product: product._id,
        quantity: qty,
        price: unitPrice,
      });

      serverTotal += qty * unitPrice;
    }

    const uniquePoNumber = await generateUniquePONumber();

    // 3. Create PO (starts in 'Pending'; stock is NOT altered)
    const initialHistory = [
      {
        fromStatus: 'None',
        toStatus: 'Pending',
        changedBy: req.user._id,
        changedAt: new Date(),
        notes: remarks || notes || 'Purchase Order drafted and issued internally',
      },
    ];

    const purchaseOrder = await PurchaseOrder.create({
      poNumber: uniquePoNumber,
      supplier: supplier._id,
      products: lineItems,
      TotalAmount: serverTotal,
      status: 'Pending',
      paymentStatus: paymentStatus || 'unpaid',
      paymentTerms: paymentTerms || 'Net 30',
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
      remarks: (remarks || notes)?.trim(),
      createdBy: req.user._id,
      statusHistory: initialHistory,
      paidAmount: 0,
      payments: [],
    });

    const populatedOrder = await PurchaseOrder.findById(purchaseOrder._id)
      .populate('supplier')
      .populate('products.product')
      .populate('createdBy', 'name email');

    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ message: error.message || 'Failed to create Purchase Order' });
  }
};

// @desc    Get all Purchase Orders (with Search, Filtering, and Pagination)
// @route   GET /api/purchase-orders
// @access  Private (Admin, Purchase_Manager, Inventory_Manager, Sales_Manager)
export const getPurchaseOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.supplier) {
      filter.supplier = req.query.supplier;
    }

    // Search by poNumber or supplier name
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search.trim(), $options: 'i' };
      const matchedSuppliers = await Supplier.find({ name: searchRegex }).select('_id');
      const supplierIds = matchedSuppliers.map((s) => s._id);

      filter.$or = [
        { poNumber: searchRegex },
        { remarks: searchRegex },
        { supplier: { $in: supplierIds } },
      ];
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
      pages: Math.ceil(total / limit) || 1,
      totalOrders: total,
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch purchase orders' });
  }
};

// @desc    Get single Purchase Order by ID (with GRN history summary)
// @route   GET /api/purchase-orders/:id
// @access  Private
export const getPurchaseOrderById = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier')
      .populate('products.product')
      .populate('createdBy', 'name email')
      .populate('statusHistory.changedBy', 'name email')
      .populate('payments.recordedBy', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    // Fetch related GRNs for this PO to compute remaining vs received balance
    const grns = await GRN.find({ purchaseOrder: order._id })
      .populate('receivedBy', 'name email')
      .sort({ createdAt: -1 });

    const receivedSummary = {};
    order.products.forEach((p) => {
      const pId = (p.product?._id || p.product).toString();
      receivedSummary[pId] = {
        ordered: p.quantity,
        received: 0,
        accepted: 0,
        rejected: 0,
        remaining: p.quantity,
      };
    });

    grns.forEach((grn) => {
      grn.productsReceived.forEach((item) => {
        const pId = item.product.toString();
        if (receivedSummary[pId]) {
          receivedSummary[pId].received += item.receivedQuantity || 0;
          receivedSummary[pId].accepted += item.acceptedQuantity || 0;
          receivedSummary[pId].rejected += item.rejectedQuantity || 0;
          receivedSummary[pId].remaining = Math.max(0, receivedSummary[pId].ordered - receivedSummary[pId].accepted);
        }
      });
    });

    res.status(200).json({
      order,
      grns,
      receivedSummary,
      outstandingBalance: Math.max(0, order.TotalAmount - (order.paidAmount || 0)),
    });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch purchase order' });
  }
};

// @desc    Update Purchase Order status with State-Machine Validation
// @route   PUT /api/purchase-orders/:id/status
// @access  Private (Admin, Purchase_Manager)
export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      notes,
      expectedDeliveryDate,
      carrier,
      trackingNumber,
    } = req.body;

    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    // Direct transition to Delivered or Partially_Received via status endpoint is forbidden
    if (status === 'Delivered' || status === 'Partially_Received') {
      return res.status(400).json({
        message: `Direct transition to "${status}" is not permitted. This status is reached automatically when warehouse Goods Receipt Notes (GRN) are accepted into inventory.`,
      });
    }

    // State machine validation
    if (status && status !== order.status) {
      const allowedNextStates = VALID_PO_TRANSITIONS[order.status] || [];
      if (!allowedNextStates.includes(status)) {
        return res.status(400).json({
          message: `Invalid status transition from "${order.status}" to "${status}". Allowed next states: [${
            allowedNextStates.join(', ') || 'None (Terminal state)'
          }]`,
        });
      }

      // Cancellation safety check: cannot cancel an order that already received inventory
      if (status === 'Cancelled') {
        const grnCount = await GRN.countDocuments({ purchaseOrder: order._id });
        if (grnCount > 0 || order.status === 'Partially_Received') {
          return res.status(400).json({
            message: 'Cannot cancel a Purchase Order that has already received goods via GRN. Initiate a formal return instead.',
          });
        }
      }

      // Record audit history
      order.statusHistory.push({
        fromStatus: order.status,
        toStatus: status,
        changedBy: req.user._id,
        changedAt: new Date(),
        notes: notes || `Order transitioned to ${status}`,
      });

      order.status = status;
    }

    // Optional logistics and payment details
    if (expectedDeliveryDate) order.expectedDeliveryDate = new Date(expectedDeliveryDate);
    if (carrier !== undefined) order.carrier = carrier?.trim();
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber?.trim();
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    const updatedOrder = await PurchaseOrder.findById(order._id)
      .populate('supplier')
      .populate('products.product')
      .populate('createdBy', 'name email');

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error updating purchase order status:', error);
    res.status(500).json({ message: error.message || 'Failed to update order status' });
  }
};

// @desc    Record a vendor payment against a Purchase Order
// @route   POST /api/purchase-orders/:id/payments
// @access  Private (Admin, Purchase_Manager)
export const recordPurchaseOrderPayment = async (req, res) => {
  try {
    const { amount, paymentMethod, reference, notes } = req.body;
    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (order.status === 'Cancelled') {
      return res.status(400).json({ message: 'Cannot record payments against a cancelled Purchase Order' });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be a positive number greater than 0' });
    }

    const currentPaid = order.paidAmount || 0;
    const outstanding = Math.max(0, order.TotalAmount - currentPaid);

    // Prevent accidental overpayment
    if (payAmount > outstanding + 0.001) {
      return res.status(400).json({
        message: `Payment amount ($${payAmount.toFixed(2)}) exceeds remaining outstanding balance ($${outstanding.toFixed(2)})`,
      });
    }

    const newPaidTotal = currentPaid + payAmount;
    order.paidAmount = newPaidTotal;

    // Determine new payment status based on financial balance
    if (newPaidTotal >= order.TotalAmount - 0.001) {
      order.paymentStatus = 'Paid';
    } else if (newPaidTotal > 0) {
      order.paymentStatus = 'partial';
    } else {
      order.paymentStatus = 'unpaid';
    }

    order.payments.push({
      amount: payAmount,
      paidDate: new Date(),
      paymentMethod: paymentMethod || 'Bank Transfer',
      reference: reference?.trim(),
      recordedBy: req.user._id,
      notes: notes?.trim(),
    });

    await order.save();

    const populatedOrder = await PurchaseOrder.findById(order._id)
      .populate('supplier')
      .populate('products.product')
      .populate('payments.recordedBy', 'name email');

    res.status(201).json({
      message: 'Payment recorded successfully',
      paymentStatus: populatedOrder.paymentStatus,
      paidAmount: populatedOrder.paidAmount,
      outstandingBalance: Math.max(0, populatedOrder.TotalAmount - populatedOrder.paidAmount),
      order: populatedOrder,
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ message: error.message || 'Failed to record payment' });
  }
};
