import mongoose from 'mongoose';
import GRN from '../models/GRN.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Product from '../models/Product.js';

// @desc    Create a new Goods Receipt Note (GRN) & update inventory stock
// @route   POST /api/grns
// @access  Private (Admin, Inventory_Manager)
export const createGRN = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { purchaseOrder, productsReceived, remarks } = req.body;

    // 1. Input Validation: Check non-empty receipt items
    if (!purchaseOrder) {
      return res.status(400).json({ message: 'Purchase Order ID is required' });
    }

    if (!productsReceived || !Array.isArray(productsReceived) || productsReceived.length === 0) {
      return res.status(400).json({ message: 'GRN must contain at least one received product item' });
    }

    // 2. Verify Purchase Order existence and status
    const po = await PurchaseOrder.findById(purchaseOrder);
    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (po.status === 'Delivered') {
      return res.status(400).json({ message: 'This Purchase Order has already been fully delivered and received' });
    }

    if (po.status === 'Cancelled') {
      return res.status(400).json({ message: 'Cannot generate a Goods Receipt Note for a cancelled Purchase Order' });
    }

    // 3. Map ordered quantities from the Purchase Order
    const orderedQtyMap = {};
    po.products.forEach((p) => {
      const prodId = (p.product._id || p.product).toString();
      orderedQtyMap[prodId] = p.quantity;
    });

    // 4. Fetch all past GRNs for this PO to compute previously received quantities
    const pastGRNs = await GRN.find({ purchaseOrder });
    const pastReceivedQtyMap = {};
    pastGRNs.forEach((g) => {
      g.productsReceived.forEach((p) => {
        const prodId = (p.product._id || p.product).toString();
        pastReceivedQtyMap[prodId] = (pastReceivedQtyMap[prodId] || 0) + p.quantity;
      });
    });

    // 5. Validate incoming items against order limits & verify products
    for (const item of productsReceived) {
      if (!item.product) {
        return res.status(400).json({ message: 'Product ID is required for each received item' });
      }

      const prodId = item.product.toString();

      // Check if product was ordered on this PO
      if (!orderedQtyMap[prodId]) {
        return res.status(400).json({ 
          message: `Product with ID ${item.product} was not included in this Purchase Order` 
        });
      }

      const receivedQty = Number(item.quantity);
      if (!receivedQty || receivedQty <= 0) {
        return res.status(400).json({ message: 'Received quantity must be a positive number greater than 0' });
      }

      const orderedQty = orderedQtyMap[prodId];
      const previouslyReceived = pastReceivedQtyMap[prodId] || 0;
      const remainingAllowed = orderedQty - previouslyReceived;

      // Over-receipt protection: Cannot intake more than remaining balance
      if (receivedQty > remainingAllowed) {
        return res.status(400).json({
          message: `Received quantity (${receivedQty}) exceeds remaining order balance (${remainingAllowed}) for product ${item.product}. Total ordered: ${orderedQty}, already received: ${previouslyReceived}.`
        });
      }

      // Verify product exists in catalog
      const productDoc = await Product.findById(item.product);
      if (!productDoc) {
        return res.status(404).json({ message: `Product not found with ID ${item.product}` });
      }
    }

    // 6. Execute atomic operations inside MongoDB ACID Transaction
    let createdGrnId = null;
    await session.withTransaction(async () => {
      // Step A: Create GRN Document within session
      const [newGrn] = await GRN.create(
        [
          {
            purchaseOrder,
            productsReceived: productsReceived.map((item) => ({
              product: item.product,
              quantity: Number(item.quantity),
              receivedDate: new Date(),
            })),
            remarks,
            receivedBy: req.user._id,
            status: 'Received',
          },
        ],
        { session }
      );
      createdGrnId = newGrn._id;

      // Step B: Atomically increment warehouse stock for each product
      for (const item of productsReceived) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: Number(item.quantity) } },
          { session }
        );
      }

      // Step C: Calculate cumulative totals (past + current) to evaluate full vs partial delivery
      const cumulativeReceivedMap = { ...pastReceivedQtyMap };
      productsReceived.forEach((item) => {
        const prodId = item.product.toString();
        cumulativeReceivedMap[prodId] = (cumulativeReceivedMap[prodId] || 0) + Number(item.quantity);
      });

      let allFullyReceived = true;
      for (const prodId in orderedQtyMap) {
        const ordered = orderedQtyMap[prodId];
        const totalReceived = cumulativeReceivedMap[prodId] || 0;
        if (totalReceived < ordered) {
          allFullyReceived = false;
          break;
        }
      }

      // Step D: Transition Purchase Order status based on completion
      po.status = allFullyReceived ? 'Delivered' : 'Processing';
      await po.save({ session });
    });

    await session.endSession();

    // 7. Return populated result
    const populatedGRN = await GRN.findById(createdGrnId)
      .populate({
        path: 'purchaseOrder',
        populate: { path: 'supplier' },
      })
      .populate('productsReceived.product')
      .populate('receivedBy', 'name email');

    res.status(201).json(populatedGRN);
  } catch (error) {
    await session.endSession();
    console.error('Error creating GRN:', error);
    res.status(500).json({ message: error.message || 'Transaction aborted: failed to create GRN' });
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
        populate: { path: 'supplier' },
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
        populate: { path: 'supplier' },
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
