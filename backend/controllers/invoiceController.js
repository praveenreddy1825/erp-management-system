import Invoice from '../models/Invoice.js';
import SalesOrder from '../models/SalesOrder.js';
import Contact from '../models/Contact.js';
import Customer from '../models/Customer.js';
import User from '../models/User.js';

// @desc    Create a new Invoice for a Sales Order
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

    // 2. Check if an invoice has already been generated for this Sales Order
    const invoiceExists = await Invoice.findOne({ salesOrder });
    if (invoiceExists) {
      return res.status(400).json({ 
        message: 'An invoice has already been created for this Sales Order',
        invoiceNumber: invoiceExists.invoiceNumber 
      });
    }

    // 3. Create the Invoice
    const invoice = await Invoice.create({
      salesOrder,
      dueDate,
      remarks,
    });

    // Populate full details for the response
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate({
        path: 'salesOrder',
        populate: [
          { path: 'customer', populate: { path: 'contactInfo' } }, // Customer profile + contact details
          { path: 'products.product' },                             // Products purchased
          { path: 'createdBy', select: 'name email' }               // Employee who placed order
        ]
      });

    res.status(201).json(populatedInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all Invoices (with Pagination)
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
        // Find all SalesOrders for this customer
        const salesOrders = await SalesOrder.find({ customer: customerDoc._id }).select('_id');
        const salesOrderIds = salesOrders.map(so => so._id);
        filter.salesOrder = { $in: salesOrderIds };
      } else {
        return res.status(200).json({
          invoices: [],
          page: 1,
          pages: 0,
          totalInvoices: 0,
        });
      }
    }

    const total = await Invoice.countDocuments(filter);
    
    // Deep populate the relationships to return complete details
    const invoices = await Invoice.find(filter)
      .populate({
        path: 'salesOrder',
        populate: [
          { path: 'customer', populate: { path: 'contactInfo' } },
          { path: 'products.product' }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      invoices,
      page,
      pages: Math.ceil(total / limit),
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
          { path: 'createdBy', select: 'name email' }
        ]
      });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Access check: Customers can only view their own invoices
    if (req.user && req.user.role === 'Customer') {
      const contact = await Contact.findOne({ email: req.user.email });
      const customerDoc = await Customer.findOne({ contactInfo: contact?._id });
      if (!customerDoc || !invoice.salesOrder || invoice.salesOrder.customer._id.toString() !== customerDoc._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this invoice' });
      }
    }

    res.status(200).json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
