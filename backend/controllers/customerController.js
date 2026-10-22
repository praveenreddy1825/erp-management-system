import Customer from '../models/Customer.js';
import Contact from '../models/Contact.js';
import User from '../models/User.js';
//A customer is a person or company that buys goods/services from our company.
// @desc    Get all customers (with Search and Pagination)
// @route   GET /api/customers
// @access  Private
export const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Search filter (checks customer name)
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }

    // Filter for Customer role (Own only)
    if (req.user && req.user.role === 'Customer') {
      const contact = await Contact.findOne({ email: req.user.email });
      const customerDoc = await Customer.findOne({ contactInfo: contact?._id });
      if (customerDoc) {
        query._id = customerDoc._id;
      } else {
        return res.status(200).json({
          customers: [],
          page: 1,
          pages: 0,
          totalCustomers: 0,
        });
      }
    }

    const total = await Customer.countDocuments(query);
    
    // Clean up any legacy placeholder address text
    await Contact.updateMany(
      { 'address.street': { $in: ['Self-Registered Customer', 'Customer Delivery Address'] } },
      { $set: { 'address.street': 'No details' } }
    ).catch(() => {});

    // Fetch customers and populate the contactInfo reference
    const customers = await Customer.find(query)
      .populate('contactInfo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      customers,
      page,
      pages: Math.ceil(total / limit),
      totalCustomers: total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new customer (creates Contact first, then Customer)
// @route   POST /api/customers
// @access  Private (Admin, Sales_Manager)
export const createCustomer = async (req, res) => {
  try {
    const { name, email, phone_number, address } = req.body;

    let contactInfoId = null;

    // Only create a Contact document if email, phone, or address is provided
    if (email || phone_number || address) {
      // If email is provided, check for duplicate email in contacts
      if (email) {
        const emailExists = await Contact.findOne({ email });
        if (emailExists) {
          return res.status(400).json({ message: 'A contact with this email already exists' });
        }
      }

      const contact = await Contact.create({
        email,
        phone_number,
        address,
      });
      contactInfoId = contact._id;
    }

    // Create the customer and link the contactInfo ID
    const customer = await Customer.create({
      name,
      contactInfo: contactInfoId,
    });

    // Auto-create User login account if email is provided
    if (email) {
      const userExists = await User.findOne({ email });
      if (!userExists) {
        await User.create({
          name,
          email,
          phone_number: phone_number || '0000000000',
          role: 'Customer',
          password: 'Welcome@123', // Compliant default password
        });
      }
    }

    // Populate contactInfo before sending back response
    const populatedCustomer = await Customer.findById(customer._id).populate('contactInfo');

    res.status(201).json(populatedCustomer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a customer
// @route   PUT /api/customers/:id
// @access  Private (Admin, Sales_Manager)
export const updateCustomer = async (req, res) => {
  try {
    const { name, email, phone_number, address } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Restrict Customer role to own profile only
    if (req.user && req.user.role === 'Customer') {
      const contact = await Contact.findOne({ email: req.user.email });
      const customerDoc = await Customer.findOne({ contactInfo: contact?._id });
      if (!customerDoc || customerDoc._id.toString() !== req.params.id) {
        return res.status(403).json({ message: 'Not authorized to update other customer profiles' });
      }
    }

    // 1. Update customer name
    if (name) customer.name = name;

    // 2. Handle linked Contact updates
    if (customer.contactInfo) {
      // Update existing contact document
      await Contact.findByIdAndUpdate(
        customer.contactInfo,
        { $set: { email, phone_number, address } },
        { new: true, runValidators: true }
      );
    } else if (email || phone_number || address) {
      // If customer did not have contactInfo before, but is providing it now:
      const contact = await Contact.create({ email, phone_number, address });
      customer.contactInfo = contact._id;
    }

    await customer.save();

    const updatedCustomer = await Customer.findById(req.params.id).populate('contactInfo');
    res.status(200).json(updatedCustomer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a customer
// @route   DELETE /api/customers/:id
// @access  Private (Admin only)
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Delete linked Contact record first
    if (customer.contactInfo) {
      await Contact.findByIdAndDelete(customer.contactInfo);
    }

    await Customer.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Customer and contact info removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
