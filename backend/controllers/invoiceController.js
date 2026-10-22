import Invoice from '../models/Invoice.js';
import SalesOrder from '../models/SalesOrder.js';
import Contact from '../models/Contact.js';
import Customer from '../models/Customer.js';

// @desc    Create a new Invoice for a fulfilled Sales Order
// @route   POST /api/invoices
// @access  Private (Admin, Sales_Manager)
export const createInvoice = async (req, res) => {
  try {
    const { salesOrder, dueDate, remarks } = req.body;

    // 1. Verify Sales Order exists
    const order = await SalesOrder.findById(salesOrder);
    if (!order) {
      return res.status(404).json({ message: 'Sales Order not found' });
    }

    // 2. Master Prompt Section 10: Invoices generated ONLY after successful sales-order fulfilment
    if (!['Fulfilled', 'Delivered'].includes(order.status)) {
      return res.status(400).json({
        message: `Invoices can only be generated after an order is fulfilled. Current status is "${order.status}".`,
      });
    }

    // 3. Check for existing invoice
    const invoiceExists = await Invoice.findOne({ salesOrder });
    if (invoiceExists) {
      return res.status(400).json({
        message: 'An invoice has already been created for this Sales Order',
        invoiceNumber: invoiceExists.invoiceNumber,
      });
    }

    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 4. Calculate authoritative order total (checks TotalAmount, totalAmount, or sum of products)
    const orderTotal = Number(
      order.TotalAmount ||
      order.totalAmount ||
      (order.products || []).reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0)
    ) || 0;

    // If order has 0 recorded for TotalAmount, also heal order document
    if ((!order.TotalAmount || order.TotalAmount <= 0) && orderTotal > 0) {
      order.TotalAmount = orderTotal;
      await order.save().catch(() => {});
    }

    const isOrderPaid = order.paymentStatus === 'Paid';
    const invoice = await Invoice.create({
      invoiceNumber,
      salesOrder: order._id,
      customer: order.customer,
      totalAmount: orderTotal,
      paymentStatus: isOrderPaid ? 'Paid' : 'Unpaid',
      paidAmount: isOrderPaid ? orderTotal : 0,
      paidDate: isOrderPaid ? new Date() : null,
      paymentMethod: isOrderPaid ? 'Direct Payment / Checkout' : undefined,
      recordedBy: isOrderPaid ? (req.user?._id || undefined) : undefined,
      dueDate,
      remarks,
    });

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate({
        path: 'salesOrder',
        populate: [
          { path: 'customer', populate: { path: 'contactInfo' } },
          { path: 'products.product' },
          { path: 'createdBy', select: 'name email' },
        ],
      })
      .populate('customer')
      .populate('recordedBy', 'name email');

    res.status(201).json(populatedInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all Invoices (with Pagination & Scoping)
// @route   GET /api/invoices
// @access  Private
export const getInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (req.user && req.user.role === 'Supplier') {
      return res.status(200).json({
        invoices: [],
        page: 1,
        pages: 0,
        totalInvoices: 0,
      });
    }

    let filter = {};
    if (req.user && req.user.role === 'Customer') {
      const emailPattern = new RegExp(`^${req.user.email.trim()}$`, 'i');
      const contact = await Contact.findOne({ email: { $regex: emailPattern } });
      const customerDoc = contact ? await Customer.findOne({ contactInfo: contact._id }) : null;

      const userOrders = await SalesOrder.find({ createdBy: req.user._id }).select('_id');
      const orClauses = [];
      if (customerDoc) {
        orClauses.push({ customer: customerDoc._id });
      }
      if (userOrders && userOrders.length > 0) {
        orClauses.push({ salesOrder: { $in: userOrders.map((o) => o._id) } });
      }

      if (orClauses.length > 0) {
        filter.$or = orClauses;
      } else {
        return res.status(200).json({
          invoices: [],
          page: 1,
          pages: 0,
          totalInvoices: 0,
        });
      }
    }

    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.search) {
      filter.invoiceNumber = { $regex: req.query.search.trim(), $options: 'i' };
    }

    const total = await Invoice.countDocuments(filter);

    const invoices = await Invoice.find(filter)
      .populate({
        path: 'salesOrder',
        populate: [
          { path: 'customer', populate: { path: 'contactInfo' } },
          { path: 'products.product' },
        ],
      })
      .populate('customer')
      .populate('recordedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Reconcile and auto-heal totalAmount and payment status if linked Sales Order has amount or is Paid
    invoices.forEach((inv) => {
      const orderTotal = Number(
        inv.salesOrder?.TotalAmount ||
        inv.salesOrder?.totalAmount ||
        (inv.salesOrder?.products || []).reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0)
      ) || 0;

      const needsTotalUpdate = (!inv.totalAmount || inv.totalAmount <= 0) && orderTotal > 0;
      const needsPaidUpdate = inv.paymentStatus !== 'Paid' && inv.salesOrder?.paymentStatus === 'Paid';

      if (needsTotalUpdate || needsPaidUpdate) {
        if (needsTotalUpdate) {
          inv.totalAmount = orderTotal;
        }
        if (needsPaidUpdate) {
          inv.paymentStatus = 'Paid';
          inv.paidAmount = inv.totalAmount;
        }

        const updateFields = {};
        if (needsTotalUpdate) updateFields.totalAmount = orderTotal;
        if (needsPaidUpdate) {
          updateFields.paymentStatus = 'Paid';
          updateFields.paidAmount = inv.totalAmount;
          updateFields.paidDate = inv.salesOrder?.updatedAt || new Date();
          updateFields.paymentMethod = 'Direct Payment / Sales Order';
        }

        Invoice.findByIdAndUpdate(inv._id, updateFields).exec();
      }
    });

    res.status(200).json({
      invoices,
      page,
      pages: Math.ceil(total / limit) || 1,
      totalInvoices: total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single Invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoiceById = async (req, res) => {
  try {
    if (req.user && req.user.role === 'Supplier') {
      return res.status(403).json({ message: 'Not authorized to view billing invoices' });
    }

    const invoice = await Invoice.findById(req.params.id)
      .populate({
        path: 'salesOrder',
        populate: [
          { path: 'customer', populate: { path: 'contactInfo' } },
          { path: 'products.product' },
          { path: 'createdBy', select: 'name email' },
        ],
      })
      .populate('customer')
      .populate('recordedBy', 'name email');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Auto-heal totalAmount and payment status if linked Sales Order has amount or is Paid
    const orderTotal = Number(
      invoice.salesOrder?.TotalAmount ||
      invoice.salesOrder?.totalAmount ||
      (invoice.salesOrder?.products || []).reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0)
    ) || 0;

    const needsTotalUpdate = (!invoice.totalAmount || invoice.totalAmount <= 0) && orderTotal > 0;
    const needsPaidUpdate = invoice.paymentStatus !== 'Paid' && invoice.salesOrder?.paymentStatus === 'Paid';

    if (needsTotalUpdate || needsPaidUpdate) {
      if (needsTotalUpdate) invoice.totalAmount = orderTotal;
      if (needsPaidUpdate) {
        invoice.paymentStatus = 'Paid';
        invoice.paidAmount = invoice.totalAmount;
      }
      const updateFields = {};
      if (needsTotalUpdate) updateFields.totalAmount = orderTotal;
      if (needsPaidUpdate) {
        updateFields.paymentStatus = 'Paid';
        updateFields.paidAmount = invoice.totalAmount;
        updateFields.paidDate = invoice.salesOrder?.updatedAt || new Date();
        updateFields.paymentMethod = 'Direct Payment / Sales Order';
      }
      await Invoice.findByIdAndUpdate(invoice._id, updateFields);
    }

    // Access check: Customers can only view their own invoices
    if (req.user && req.user.role === 'Customer') {
      const contact = await Contact.findOne({ email: req.user.email });
      const customerDoc = await Customer.findOne({ contactInfo: contact?._id });
      if (!customerDoc || invoice.customer.toString() !== customerDoc._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this invoice' });
      }
    }

    res.status(200).json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Record customer payment against an eligible invoice
// @route   POST /api/invoices/:id/payments
// @access  Private (Admin, Sales_Manager)
export const recordCustomerPayment = async (req, res) => {
  try {
    const { amount, paymentMethod, reference, notes } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Auto-heal totalAmount if legacy invoice had 0 recorded
    if (!invoice.totalAmount || invoice.totalAmount <= 0) {
      const order = await SalesOrder.findById(invoice.salesOrder);
      const computedTotal = Number(
        order?.TotalAmount ||
        order?.totalAmount ||
        (order?.products || []).reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0)
      ) || 0;
      if (computedTotal > 0) {
        invoice.totalAmount = computedTotal;
        await Invoice.findByIdAndUpdate(invoice._id, { totalAmount: computedTotal });
      }
    }

    const cleanRef = reference?.trim();

    // Idempotent retry check: if already paid with same reference, return success idempotently
    if (invoice.paymentStatus === 'Paid') {
      if (cleanRef && invoice.paymentReference === cleanRef) {
        const populated = await Invoice.findById(invoice._id)
          .populate({
            path: 'salesOrder',
            populate: [
              { path: 'customer', populate: { path: 'contactInfo' } },
              { path: 'products.product' },
            ],
          })
          .populate('customer')
          .populate('recordedBy', 'name email');

        return res.status(200).json({
          message: 'Customer payment recorded successfully (idempotent replay)',
          invoice: populated,
        });
      }
      return res.status(400).json({ message: 'This invoice has already been paid in full' });
    }

    // Verify linked Sales Order is not cancelled or rejected
    if (invoice.salesOrder) {
      const order = await SalesOrder.findById(invoice.salesOrder);
      if (order && ['Cancelled', 'Rejected'].includes(order.status)) {
        return res.status(400).json({
          message: `Cannot record payment: Linked Sales Order is "${order.status}".`,
        });
      }
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be a positive number greater than 0' });
    }

    // Master Prompt Section 10: Full payments only; no partial payments
    if (Math.abs(payAmount - invoice.totalAmount) > 0.01) {
      return res.status(400).json({
        message: `Payments are full payments only. Payment amount ($${payAmount.toFixed(2)}) must match invoice total ($${invoice.totalAmount.toFixed(2)})`,
      });
    }

    // Atomic conditional update ensures only one concurrent payment can succeed
    const updatedInvoice = await Invoice.findOneAndUpdate(
      {
        _id: invoice._id,
        paymentStatus: 'Unpaid',
      },
      {
        $set: {
          paymentStatus: 'Paid',
          paidAmount: invoice.totalAmount,
          paidDate: new Date(),
          paymentMethod: paymentMethod || 'Bank Transfer',
          paymentReference: cleanRef,
          recordedBy: req.user._id,
          remarks: notes ? ((invoice.remarks ? `${invoice.remarks} | ` : '') + notes.trim()) : invoice.remarks,
        },
      },
      { returnDocument: 'after' }
    );

    if (!updatedInvoice) {
      // Check if another concurrent request just paid it with the same reference
      const checkAgain = await Invoice.findById(invoice._id);
      if (checkAgain && checkAgain.paymentStatus === 'Paid' && cleanRef && checkAgain.paymentReference === cleanRef) {
        const populated = await Invoice.findById(checkAgain._id)
          .populate({
            path: 'salesOrder',
            populate: [
              { path: 'customer', populate: { path: 'contactInfo' } },
              { path: 'products.product' },
            ],
          })
          .populate('customer')
          .populate('recordedBy', 'name email');

        return res.status(200).json({
          message: 'Customer payment recorded successfully (idempotent replay)',
          invoice: populated,
        });
      }
      return res.status(400).json({ message: 'This invoice has already been paid in full' });
    }

    // Also synchronize payment status on linked Sales Order
    if (updatedInvoice.salesOrder) {
      await SalesOrder.findByIdAndUpdate(updatedInvoice.salesOrder, { paymentStatus: 'Paid' });
    }

    const populated = await Invoice.findById(updatedInvoice._id)
      .populate({
        path: 'salesOrder',
        populate: [
          { path: 'customer', populate: { path: 'contactInfo' } },
          { path: 'products.product' },
        ],
      })
      .populate('customer')
      .populate('recordedBy', 'name email');

    res.status(200).json({
      message: 'Customer payment recorded successfully',
      invoice: populated,
    });
  } catch (error) {
    console.error('Error recording customer payment:', error);
    res.status(500).json({ message: error.message || 'Failed to record customer payment' });
  }
};
