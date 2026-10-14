import Supplier from '../models/Supplier.js';
import Contact from '../models/Contact.js';
import PurchaseOrder from '../models/PurchaseOrder.js';

// @desc    Get all suppliers (with Search, Filter, and Pagination)
// @route   GET /api/suppliers
// @access  Private (Admin, Purchase_Manager, Inventory_Manager, Sales_Manager)
export const getSuppliers = async (req, res) => {
  try {
    const query = {};

    // Filter by active status if requested
    if (req.query.isActive !== undefined) {
      if (req.query.isActive === 'true') {
        query.isActive = { $ne: false };
      } else if (req.query.isActive === 'false') {
        query.isActive = false;
      }
    }

    // Search filter (checks supplier name)
    if (req.query.search) {
      query.name = { $regex: req.query.search.trim(), $options: 'i' };
    }

    const total = await Supplier.countDocuments(query);

    // If caller requests all suppliers (e.g. for PO dropdowns)
    if (req.query.all === 'true' || req.query.limit === 'all' || parseInt(req.query.limit, 10) >= 1000) {
      const suppliers = await Supplier.find(query)
        .populate('contactInfo')
        .sort({ name: 1 });

      return res.status(200).json({
        suppliers,
        page: 1,
        pages: 1,
        totalSuppliers: total,
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const suppliers = await Supplier.find(query)
      .populate('contactInfo')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      suppliers,
      page,
      pages: Math.ceil(total / limit) || 1,
      totalSuppliers: total,
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch suppliers' });
  }
};

// @desc    Get single supplier with associated PO history summary
// @route   GET /api/suppliers/:id
// @access  Private (Admin, Purchase_Manager, Inventory_Manager)
export const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id).populate('contactInfo');
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Fetch related purchase orders for this supplier
    const purchaseOrders = await PurchaseOrder.find({ supplier: req.params.id })
      .select('poNumber status paymentStatus TotalAmount createdAt expectedDeliveryDate')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      supplier,
      purchaseOrders,
      totalOrders: purchaseOrders.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch supplier details' });
  }
};

// @desc    Create a new supplier (no automatic user login created)
// @route   POST /api/suppliers
// @access  Private (Admin, Purchase_Manager)
export const createSupplier = async (req, res) => {
  try {
    const { name, email, phone_number, address, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Supplier company name is required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Supplier email address is required' });
    }

    if (!phone_number || !phone_number.trim()) {
      return res.status(400).json({ message: 'Supplier phone number is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for duplicate contact email
    const emailExists = await Contact.findOne({ email: normalizedEmail });
    if (emailExists) {
      const existingSupplier = await Supplier.findOne({ contactInfo: emailExists._id });
      if (existingSupplier) {
        return res.status(400).json({
          message: `A supplier named "${existingSupplier.name}" is already registered with email ${normalizedEmail}`,
        });
      }
    }

    // 1. Create Contact document
    const formattedAddress = typeof address === 'string' ? { street: address.trim() } : address || {};
    const contact = await Contact.create({
      email: normalizedEmail,
      phone_number: phone_number.trim(),
      address: formattedAddress,
    });

    // 2. Create Supplier profile (no external User account created)
    const supplier = await Supplier.create({
      name: name.trim(),
      contactInfo: contact._id,
      notes: notes?.trim(),
      isActive: true,
    });

    const populatedSupplier = await Supplier.findById(supplier._id).populate('contactInfo');
    res.status(201).json(populatedSupplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ message: error.message || 'Failed to create supplier' });
  }
};

// @desc    Update a supplier
// @route   PUT /api/suppliers/:id
// @access  Private (Admin, Purchase_Manager)
export const updateSupplier = async (req, res) => {
  try {
    const { name, email, phone_number, address, notes, isActive } = req.body;
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    if (name) supplier.name = name.trim();
    if (notes !== undefined) supplier.notes = notes?.trim();
    if (isActive !== undefined) supplier.isActive = Boolean(isActive);

    // Update Contact details
    const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
    if (normalizedEmail) {
      const duplicateContact = await Contact.findOne({
        email: normalizedEmail,
        _id: { $ne: supplier.contactInfo },
      });
      if (duplicateContact) {
        return res.status(400).json({ message: `Email ${normalizedEmail} is already used by another contact` });
      }
    }

    const formattedAddress = typeof address === 'string' ? { street: address.trim() } : address;

    if (supplier.contactInfo) {
      const contactUpdates = {};
      if (normalizedEmail) contactUpdates.email = normalizedEmail;
      if (phone_number) contactUpdates.phone_number = phone_number.trim();
      if (formattedAddress) contactUpdates.address = formattedAddress;

      await Contact.findByIdAndUpdate(supplier.contactInfo, { $set: contactUpdates }, { runValidators: true });
    } else if (normalizedEmail || phone_number) {
      const newContact = await Contact.create({
        email: normalizedEmail || 'unknown@supplier.com',
        phone_number: phone_number || '0000000000',
        address: formattedAddress || {},
      });
      supplier.contactInfo = newContact._id;
    }

    await supplier.save();

    const updatedSupplier = await Supplier.findById(req.params.id).populate('contactInfo');
    res.status(200).json(updatedSupplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ message: error.message || 'Failed to update supplier' });
  }
};

// @desc    Delete or safely deactivate a supplier
// @route   DELETE /api/suppliers/:id
// @access  Private (Admin only)
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Safe business rule: Do not hard-delete suppliers with historical purchase orders
    const poCount = await PurchaseOrder.countDocuments({ supplier: req.params.id });
    if (poCount > 0) {
      supplier.isActive = false;
      await supplier.save();
      return res.status(200).json({
        message: `Supplier has ${poCount} historical purchase orders and cannot be deleted. Deactivated instead.`,
        deactivated: true,
        action: 'deactivated',
        supplier,
      });
    }

    // If zero historical transactions, hard delete contact and supplier
    if (supplier.contactInfo) {
      await Contact.findByIdAndDelete(supplier.contactInfo);
    }
    await Supplier.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Supplier removed permanently', deactivated: false, action: 'deleted' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ message: error.message || 'Failed to delete supplier' });
  }
};
