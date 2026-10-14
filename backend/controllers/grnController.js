import mongoose from 'mongoose';
import GRN from '../models/GRN.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Product from '../models/Product.js';
import { runTransaction } from '../utils/transactionHelper.js';

// @desc    Create a new Goods Receipt Note (GRN) & atomically update inventory stock
// @route   POST /api/grns
// @access  Private (Admin, Inventory_Manager)
export const createGRN = async (req, res) => {
  try {
    const {
      purchaseOrder: poId,
      productsReceived,
      receivedItems,
      items,
      deliveryReference,
      packingSlipNumber,
      remarks,
    } = req.body;

    const itemsReceived = productsReceived || receivedItems || items;

    // 1. Input Validation
    if (!poId) {
      return res.status(400).json({ message: 'Purchase Order ID is required' });
    }

    if (!itemsReceived || !Array.isArray(itemsReceived) || itemsReceived.length === 0) {
      return res.status(400).json({ message: 'GRN must contain at least one received product line item' });
    }

    // 2. Fetch and verify Purchase Order status
    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (po.status === 'Cancelled') {
      return res.status(400).json({ message: 'Cannot generate a Goods Receipt Note for a cancelled Purchase Order' });
    }

    if (po.status === 'Delivered') {
      return res.status(400).json({ message: 'This Purchase Order has already been fully delivered and received' });
    }

    const eligibleStatuses = ['Confirmed', 'Processing', 'Shipped', 'Partially_Received', 'Pending'];
    if (!eligibleStatuses.includes(po.status)) {
      return res.status(400).json({
        message: `Purchase Order is in "${po.status}" status and is not eligible for goods receipt`,
      });
    }

    // 3. Map ordered quantities from the PO
    const orderedQtyMap = {};
    po.products.forEach((p) => {
      const prodId = (p.product?._id || p.product).toString();
      orderedQtyMap[prodId] = p.quantity;
    });

    // 4. Fetch past GRNs for this PO to compute previously accepted and received quantities
    const pastGRNs = await GRN.find({ purchaseOrder: poId, status: { $ne: 'Cancelled' } });
    const pastAcceptedMap = {};
    const pastReceivedMap = {};

    pastGRNs.forEach((g) => {
      g.productsReceived.forEach((p) => {
        const prodId = p.product.toString();
        pastAcceptedMap[prodId] = (pastAcceptedMap[prodId] || 0) + (p.acceptedQuantity || p.quantity || 0);
        pastReceivedMap[prodId] = (pastReceivedMap[prodId] || 0) + (p.receivedQuantity || p.quantity || 0);
      });
    });

    // 5. Validate incoming items, compute accepted/rejected counts
    const sanitizedReceivedItems = [];
    let totalAcceptedAcrossReceipt = 0;

    for (const item of itemsReceived) {
      if (!item.product) {
        return res.status(400).json({ message: 'Each received item must specify a valid product ID' });
      }

      const prodId = item.product.toString();
      if (!orderedQtyMap[prodId]) {
        return res.status(400).json({
          message: `Product ID ${item.product} is not part of Purchase Order ${po.poNumber || po._id}`,
        });
      }

      const orderedQty = orderedQtyMap[prodId];
      const previouslyAccepted = pastAcceptedMap[prodId] || 0;
      const remainingAllowed = Math.max(0, orderedQty - previouslyAccepted);

      // Quantities calculation
      const receivedQty = item.receivedQuantity !== undefined ? parseInt(item.receivedQuantity, 10) : parseInt(item.quantity, 10);
      const acceptedQty = item.acceptedQuantity !== undefined ? parseInt(item.acceptedQuantity, 10) : receivedQty;
      const rejectedQty = item.rejectedQuantity !== undefined ? parseInt(item.rejectedQuantity, 10) : Math.max(0, receivedQty - acceptedQty);

      if (isNaN(receivedQty) || receivedQty < 0) {
        return res.status(400).json({ message: 'Received quantity cannot be negative' });
      }
      if (isNaN(acceptedQty) || acceptedQty < 0) {
        return res.status(400).json({ message: 'Accepted quantity cannot be negative' });
      }
      if (isNaN(rejectedQty) || rejectedQty < 0) {
        return res.status(400).json({ message: 'Rejected quantity cannot be negative' });
      }

      if (acceptedQty + rejectedQty === 0) {
        return res.status(400).json({ message: 'Total counted quantity (accepted + rejected) must be at least 1 unit' });
      }

      // Over-receipt guard: cannot accept more than remaining balance on this PO
      if (acceptedQty > remainingAllowed) {
        return res.status(400).json({
          message: `Accepted quantity (${acceptedQty}) exceeds remaining balance (${remainingAllowed}) for product ${item.product}. Total ordered: ${orderedQty}, already accepted: ${previouslyAccepted}.`,
        });
      }

      // Verify product exists in catalog
      const productDoc = await Product.findById(item.product);
      if (!productDoc) {
        return res.status(404).json({ message: `Product not found with ID ${item.product}` });
      }

      sanitizedReceivedItems.push({
        product: productDoc._id,
        orderedQuantity: orderedQty,
        receivedQuantity: receivedQty,
        acceptedQuantity: acceptedQty,
        rejectedQuantity: rejectedQty,
        rejectionReason: item.rejectionReason?.trim(),
        receivedDate: new Date(),
      });

      totalAcceptedAcrossReceipt += acceptedQty;
    }

    // 6. Execute atomic inventory intake & status transition
    let createdGrnId = null;
    await runTransaction(async (session) => {
      const opts = session ? { session } : {};

      // Step A: Create GRN Document
      const [newGrn] = await GRN.create(
        [
          {
            purchaseOrder: po._id,
            productsReceived: sanitizedReceivedItems,
            deliveryReference: deliveryReference?.trim(),
            packingSlipNumber: packingSlipNumber?.trim(),
            remarks: remarks?.trim(),
            receivedBy: req.user._id,
            status: 'Completed',
          },
        ],
        opts
      );
      createdGrnId = newGrn._id;

      // Step B: Atomically increment warehouse product stock ONLY for ACCEPTED quantities
      for (const item of sanitizedReceivedItems) {
        if (item.acceptedQuantity > 0) {
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.acceptedQuantity } },
            opts
          );
        }
      }

      // Step C: Evaluate if PO is fully fulfilled or partially received
      const cumulativeAcceptedMap = { ...pastAcceptedMap };
      sanitizedReceivedItems.forEach((item) => {
        const prodId = item.product.toString();
        cumulativeAcceptedMap[prodId] = (cumulativeAcceptedMap[prodId] || 0) + item.acceptedQuantity;
      });

      let allLinesFullyDelivered = true;
      for (const prodId in orderedQtyMap) {
        const ordered = orderedQtyMap[prodId];
        const cumulativeAccepted = cumulativeAcceptedMap[prodId] || 0;
        if (cumulativeAccepted < ordered) {
          allLinesFullyDelivered = false;
          break;
        }
      }

      const nextStatus = allLinesFullyDelivered ? 'Delivered' : 'Partially_Received';
      const prevStatus = po.status;

      po.status = nextStatus;
      po.statusHistory.push({
        fromStatus: prevStatus,
        toStatus: nextStatus,
        changedBy: req.user._id,
        changedAt: new Date(),
        notes: `Goods received via GRN ${newGrn.grnNumber}. Total accepted this delivery: ${totalAcceptedAcrossReceipt} units.`,
      });

      await (session ? po.save({ session }) : po.save());
    });

    const populatedGRN = await GRN.findById(createdGrnId)
      .populate({
        path: 'purchaseOrder',
        populate: { path: 'supplier' },
      })
      .populate('productsReceived.product')
      .populate('receivedBy', 'name email');

    res.status(201).json(populatedGRN);
  } catch (error) {
    console.error('Error creating GRN:', error);
    res.status(500).json({ message: error.message || 'Failed to create Goods Receipt Note' });
  }
};

// @desc    Get all Goods Receipt Notes (with Pagination & Population)
// @route   GET /api/grns
// @access  Private (Admin, Inventory_Manager, Purchase_Manager, Sales_Manager)
export const getGRNs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.purchaseOrder) {
      filter.purchaseOrder = req.query.purchaseOrder;
    }

    const total = await GRN.countDocuments(filter);
    const grns = await GRN.find(filter)
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
      pages: Math.ceil(total / limit) || 1,
      totalGRNs: total,
    });
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch GRN logs' });
  }
};

// @desc    Get single Goods Receipt Note by ID
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
      return res.status(404).json({ message: 'Goods Receipt Note not found' });
    }

    res.status(200).json(grn);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch GRN details' });
  }
};
