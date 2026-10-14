import Invoice from '../models/Invoice.js';
import SalesOrder from '../models/SalesOrder.js';
import Contact from '../models/Contact.js';
import Customer from '../models/Customer.js';
import User from '../models/User.js';

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

    // 4. Create Invoice
    const invoice = await Invoice.create({
      invoiceNumber,
      salesOrder: order._id,
      customer: order.customer,
      totalAmount: order.TotalAmount,
      paymentStatus: 'Unpaid',
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
      const contact = await Contact.findOne({ email: req.user.email });
      const customerDoc = await Customer.findOne({ contactInfo: contact?._id });
      if (customerDoc) {
        filter.customer = customerDoc._id;
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

    if (invoice.paymentStatus === 'Paid') {
      return res.status(400).json({ message: 'This invoice has already been paid in full' });
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

    invoice.paymentStatus = 'Paid';
    invoice.paidAmount = invoice.totalAmount;
    invoice.paidDate = new Date();
    invoice.paymentMethod = paymentMethod || 'Bank Transfer';
    invoice.paymentReference = reference?.trim();
    invoice.recordedBy = req.user._id;
    if (notes) invoice.remarks = (invoice.remarks ? `${invoice.remarks} | ` : '') + notes.trim();

    await invoice.save();

    // Also synchronize payment status on linked Sales Order
    if (invoice.salesOrder) {
      await SalesOrder.findByIdAndUpdate(invoice.salesOrder, { paymentStatus: 'Paid' });
    }

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

    res.status(200).json({
      message: 'Customer payment recorded successfully',
      invoice: populated,
    });
  } catch (error) {
    console.error('Error recording customer payment:', error);
    res.status(500).json({ message: error.message || 'Failed to record customer payment' });
  }
};
