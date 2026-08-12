import SalesOrder from '../models/SalesOrder.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Contact from '../models/Contact.js';

// @desc    Create a new Sales Order
// @route   POST /api/sales-orders
// @access  Private (Admin, Sales_Manager)
export const createSalesOrder = async (req, res) => {
  try {
    const { customer, products, remarks } = req.body;

    // 1. Verify customer exists
    const customerExists = await Customer.findById(customer);
    if (!customerExists) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Verify Customer matches logged in user's profile
    if (req.user && req.user.role === 'Customer') {
      const contact = await Contact.findOne({ email: req.user.email });
      const customerDoc = await Customer.findOne({ contactInfo: contact?._id });
      if (!customerDoc || customer !== customerDoc._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to create Sales Orders for other customers' });
      }
    }

    // 2. Validate products array and check stock levels
    const finalProducts = [];
    for (const item of products) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({ message: `Product not found with ID ${item.product}` });
      }

      // Check stock level
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for product: "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}` 
        });
      }

      // Lock the price using the active product price in database
      finalProducts.push({
        product: item.product,
        quantity: item.quantity,
        price: product.price, // Lock price from database
      });
    }

    // 3. Create the Sales Order record
    const salesOrder = await SalesOrder.create({
      customer,
      products: finalProducts,
      remarks,
      createdBy: req.user._id, // Set by protect middleware
    });

    // 4. Deduct quantities from warehouse stock
    for (const item of finalProducts) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity } // Decrement stock
      });
    }

    // Return populated order
    const populatedOrder = await SalesOrder.findById(salesOrder._id)
      .populate('customer')
      .populate('products.product')
      .populate('createdBy', 'name email');

    res.status(201).json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

// @desc    Cancel a Sales Order (Restores Stock back to warehouse)
// @route   PUT /api/sales-orders/:id/cancel
// @access  Private (Admin, Sales_Manager)
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

    // Restore stock quantities back to Product collection
    for (const item of order.products) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity } // Add back the items
      });
    }

    order.status = 'Cancelled';
    await order.save();

    res.status(200).json({ message: 'Sales Order cancelled successfully, stock restored', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
