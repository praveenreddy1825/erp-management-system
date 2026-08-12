import Supplier from '../models/Supplier.js';
import Contact from '../models/Contact.js';
import User from '../models/User.js';

//A supplier is a vendor or manufacturer that sells goods/services to our company. 
// @desc    Get all suppliers (with Search and Pagination)
// @route   GET /api/suppliers
// @access  Private
export const getSuppliers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Search filter (checks supplier name)
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }

    // Filter for Supplier role (Own only)
    if (req.user && req.user.role === 'Supplier') {
      const contact = await Contact.findOne({ email: req.user.email });
      const supplierDoc = await Supplier.findOne({ contactInfo: contact?._id });
      if (supplierDoc) {
        query._id = supplierDoc._id;
      } else {
        return res.status(200).json({
          suppliers: [],
          page: 1,
          pages: 0,
          totalSuppliers: 0,
        });
      }
    }

    const total = await Supplier.countDocuments(query);
    
    // Fetch suppliers and populate contactInfo
    const suppliers = await Supplier.find(query)
      .populate('contactInfo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      suppliers,
      page,
      pages: Math.ceil(total / limit),
      totalSuppliers: total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new supplier (contact details are mandatory)
// @route   POST /api/suppliers
// @access  Private (Admin, Purchase_Manager)
export const createSupplier = async (req, res) => {
  try {
    const { name, email, phone_number, address } = req.body;

    // Contact info is mandatory for Suppliers
    if (!email || !phone_number || !address) {
      return res.status(400).json({ 
        message: 'Supplier creation requires email, phone number, and address contact details' 
      });
    }

    // Check for duplicate email in contacts database
    const emailExists = await Contact.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'A contact with this email already exists' });
    }

    // 1. Create the Contact details
    const contact = await Contact.create({
      email,
      phone_number,
      address,
    });

    // 2. Create the Supplier profile linked to the Contact ID
    const supplier = await Supplier.create({
      name,
      contactInfo: contact._id,
    });

    // 3. Auto-create User login account if not exists
    const userExists = await User.findOne({ email });
    if (!userExists) {
      await User.create({
        name,
        email,
        phone_number,
        role: 'Supplier',
        password: 'Welcome@123', // Compliant default password
      });
    }

    // Populate and return
    const populatedSupplier = await Supplier.findById(supplier._id).populate('contactInfo');
    res.status(201).json(populatedSupplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a supplier
// @route   PUT /api/suppliers/:id
// @access  Private (Admin, Purchase_Manager)
export const updateSupplier = async (req, res) => {
  try {
    const { name, email, phone_number, address } = req.body;
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Restrict Supplier role to own profile only
    if (req.user && req.user.role === 'Supplier') {
      const contact = await Contact.findOne({ email: req.user.email });
      const supplierDoc = await Supplier.findOne({ contactInfo: contact?._id });
      if (!supplierDoc || supplierDoc._id.toString() !== req.params.id) {
        return res.status(403).json({ message: 'Not authorized to update other supplier profiles' });
      }
    }

    // Update supplier name
    if (name) supplier.name = name;

    // Suppliers MUST have contactInfo. Let's update the referenced contact document
    if (supplier.contactInfo) {
      await Contact.findByIdAndUpdate(
        supplier.contactInfo,
        { $set: { email, phone_number, address } },
        { new: true, runValidators: true }
      );
    } else {
      // Fallback in case of legacy data missing a contactInfo reference
      const contact = await Contact.create({ email, phone_number, address });
      supplier.contactInfo = contact._id;
    }

    await supplier.save();

    const updatedSupplier = await Supplier.findById(req.params.id).populate('contactInfo');
    res.status(200).json(updatedSupplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a supplier
// @route   DELETE /api/suppliers/:id
// @access  Private (Admin only)
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Delete linked Contact record
    if (supplier.contactInfo) {
      await Contact.findByIdAndDelete(supplier.contactInfo);
    }

    await Supplier.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Supplier and contact info removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
