import GRN from '../models/GRN.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Product from '../models/Product.js';

// @desc    Create a new Goods Receipt Note (GRN) & update inventory stock
// @route   POST /api/grns
// @access  Private (Admin, Inventory_Manager)
export const createGRN = async (req, res) => {
  try {
    const { purchaseOrder, productsReceived, remarks } = req.body;

    // 1. Verify Purchase Order exists
    const po = await PurchaseOrder.findById(purchaseOrder);
    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (po.status === 'Received') {
      return res.status(400).json({ message: 'This Purchase Order has already been fully received' });
    }

    // 2. Validate products and update stock levels
    for (const item of productsReceived) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found with ID ${item.product}` });
      }
    }

    // 3. Create the GRN record
    const grn = await GRN.create({
      purchaseOrder,
      productsReceived, // [{ product, quantity }]
      remarks,
      receivedBy: req.user._id,
    });

    // 4. Update the inventory stock levels for each product received
    for (const item of productsReceived) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity } // Increment warehouse stock
      });
    }

    // 5. Smart Status Transition for Purchase Order
    // Calculate total quantities ordered vs already received
    const orderedQtyMap = {};
    po.products.forEach(p => {
      const prodId = (p.product._id || p.product).toString();
      orderedQtyMap[prodId] = p.quantity;
    });

    // Find all past GRNs for this Purchase Order to count previously received items
    const pastGRNs = await GRN.find({ purchaseOrder });
    const totalReceivedQtyMap = {};

    pastGRNs.forEach(g => {
      g.productsReceived.forEach(p => {
        const prodId = (p.product._id || p.product).toString();
        totalReceivedQtyMap[prodId] = (totalReceivedQtyMap[prodId] || 0) + p.quantity;
      });
    });

    // Compare ordered vs total received
    let fullyReceived = true;
    for (const prodId in orderedQtyMap) {
      const ordered = orderedQtyMap[prodId];
      const received = totalReceivedQtyMap[prodId] || 0;
      if (received < ordered) {
        fullyReceived = false;
        break;
      }
    }

    // Update Purchase Order status to schema-compatible enums
    po.status = fullyReceived ? 'Delivered' : 'Processing';
    await po.save();

    const populatedGRN = await GRN.findById(grn._id)
      .populate({
        path: 'purchaseOrder',
        populate: { path: 'supplier' }
      })
      .populate('productsReceived.product')
      .populate('receivedBy', 'name email');

    res.status(201).json(populatedGRN);
  } catch (error) {
    console.error('Error creating GRN:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all GRNs
// @route   GET /api/grns
// @access  Private
export const getGRNs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await GRN.countDocuments();
    const grns = await GRN.find()
      .populate({
        path: 'purchaseOrder',
        populate: { path: 'supplier' }
      })
      .populate('productsReceived.product')
      .populate('receivedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      grns,
      page,
      pages: Math.ceil(total / limit),
      totalGRNs: total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get GRN by ID
// @route   GET /api/grns/:id
// @access  Private
export const getGRNById = async (req, res) => {
  try {
    const grn = await GRN.findById(req.params.id)
      .populate({
        path: 'purchaseOrder',
        populate: { path: 'supplier' }
      })
      .populate('productsReceived.product')
      .populate('receivedBy', 'name email');

    if (!grn) {
      return res.status(404).json({ message: 'GRN record not found' });
    }
    res.status(200).json(grn);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
