import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import SalesOrder from '../models/SalesOrder.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Invoice from '../models/Invoice.js';
import Contact from '../models/Contact.js';

// @desc    Get comprehensive server-calculated operational & financial dashboard summary
// @route   GET /api/dashboard/summary
// @access  Private (All authenticated roles, scoped by role)
export const getDashboardSummary = async (req, res) => {
  try {
    const role = req.user.role;

    // 1. Customer Scoped Dashboard Metrics
    if (role === 'Customer') {
      const contact = await Contact.findOne({ email: req.user.email });
      const customerDoc = await Customer.findOne({ contactInfo: contact?._id });
      if (!customerDoc) {
        return res.status(200).json({
          role: 'Customer',
          totalOrders: 0,
          pendingOrders: 0,
          fulfilledOrders: 0,
          totalSpent: 0,
          unpaidInvoices: 0,
        });
      }

      const orders = await SalesOrder.find({ customer: customerDoc._id });
      const invoices = await Invoice.find({ customer: customerDoc._id });

      const totalSpent = invoices
        .filter((inv) => inv.paymentStatus === 'Paid')
        .reduce((sum, inv) => sum + (inv.paidAmount || inv.totalAmount || 0), 0);

      const unpaidInvoicesBalance = invoices
        .filter((inv) => inv.paymentStatus === 'Unpaid')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

      return res.status(200).json({
        role: 'Customer',
        totalOrders: orders.length,
        pendingOrders: orders.filter((o) => o.status === 'Pending').length,
        processingOrders: orders.filter((o) => ['Confirmed', 'Processing'].includes(o.status)).length,
        fulfilledOrders: orders.filter((o) => ['Fulfilled', 'Delivered'].includes(o.status)).length,
        cancelledOrders: orders.filter((o) => o.status === 'Cancelled').length,
        totalSpent,
        unpaidInvoicesBalance,
        unpaidInvoicesCount: invoices.filter((inv) => inv.paymentStatus === 'Unpaid').length,
        recentOrders: orders.slice(0, 5),
      });
    }

    // 2. Supplier Scoped Dashboard Metrics
    if (role === 'Supplier') {
      const supplierId = req.user.supplierProfile;
      if (!supplierId) {
        return res.status(200).json({
          role: 'Supplier',
          totalPOs: 0,
          pendingPOs: 0,
          shippedPOs: 0,
          deliveredPOs: 0,
          totalEarnings: 0,
        });
      }

      const pos = await PurchaseOrder.find({ supplier: supplierId });
      const totalEarnings = pos
        .filter((p) => p.paymentStatus === 'Paid')
        .reduce((sum, p) => sum + (p.paidAmount || p.TotalAmount || 0), 0);

      return res.status(200).json({
        role: 'Supplier',
        totalPOs: pos.length,
        pendingPOs: pos.filter((p) => p.status === 'Pending').length,
        confirmedPOs: pos.filter((p) => p.status === 'Confirmed').length,
        processingPOs: pos.filter((p) => p.status === 'Processing').length,
        shippedPOs: pos.filter((p) => p.status === 'Shipped').length,
        deliveredPOs: pos.filter((p) => p.status === 'Delivered').length,
        totalEarnings,
        unpaidDeliveredBalance: pos
          .filter((p) => p.status === 'Delivered' && p.paymentStatus !== 'Paid')
          .reduce((sum, p) => sum + (p.TotalAmount || 0), 0),
        recentPOs: pos.slice(0, 5),
      });
    }

    // 3. Management / Admin System-Wide Operational & Financial Metrics
    const [
      totalProducts,
      totalCustomers,
      totalSuppliers,
      products,
      salesOrders,
      purchaseOrders,
      invoices,
    ] = await Promise.all([
      Product.countDocuments({}),
      Customer.countDocuments({}),
      Supplier.countDocuments({ isActive: { $ne: false } }),
      Product.find({}),
      SalesOrder.find({}),
      PurchaseOrder.find({}),
      Invoice.find({}),
    ]);

    // Inventory Calculations
    let totalOnHandStock = 0;
    let totalReservedStock = 0;
    let totalAvailableStock = 0;
    const lowStockItems = [];

    products.forEach((p) => {
      const onHand = typeof p.onHand === 'number' ? p.onHand : p.stock || 0;
      const reserved = typeof p.reserved === 'number' ? p.reserved : 0;
      const available = typeof p.available === 'number' ? p.available : Math.max(0, onHand - reserved);

      totalOnHandStock += onHand;
      totalReservedStock += reserved;
      totalAvailableStock += available;

      if (available <= p.reorderLevel) {
        lowStockItems.push({
          _id: p._id,
          name: p.name,
          SKU: p.SKU,
          category: p.category,
          price: p.price,
          onHand,
          reserved,
          available,
          reorderLevel: p.reorderLevel,
        });
      }
    });

    // Financial Definitions (Master Prompt Section 11)
    // Customer Collections: Sum of recorded full customer payments
    const customerCollections = invoices
      .filter((inv) => inv.paymentStatus === 'Paid')
      .reduce((sum, inv) => sum + (inv.paidAmount || inv.totalAmount || 0), 0);

    // Supplier Payments: Sum of recorded full supplier payments
    const supplierPayments = purchaseOrders
      .filter((po) => po.paymentStatus === 'Paid')
      .reduce((sum, po) => sum + (po.paidAmount || po.TotalAmount || 0), 0);

    // Net Cash Movement: Customer collections minus supplier payments
    const netCashMovement = customerCollections - supplierPayments;

    // Outstanding Invoices: Total eligible unpaid invoice balance
    const outstandingInvoicesList = invoices.filter((inv) => inv.paymentStatus === 'Unpaid');
    const outstandingInvoicesBalance = outstandingInvoicesList.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    // Paid Invoices & Paid Purchase Orders
    const paidInvoicesList = invoices.filter((inv) => inv.paymentStatus === 'Paid');
    const paidPurchaseOrdersList = purchaseOrders.filter((po) => po.paymentStatus === 'Paid');

    // Pipeline Counts
    const pendingSalesOrders = salesOrders.filter((o) => o.status === 'Pending').length;
    const processingSalesOrders = salesOrders.filter((o) => ['Confirmed', 'Processing'].includes(o.status)).length;
    const fulfilledSalesOrders = salesOrders.filter((o) => ['Fulfilled', 'Delivered'].includes(o.status)).length;

    const pendingPurchaseOrders = purchaseOrders.filter((p) => p.status === 'Pending').length;
    const processingPurchaseOrders = purchaseOrders.filter((p) => ['Confirmed', 'Processing'].includes(p.status)).length;
    const shippedPurchaseOrders = purchaseOrders.filter((p) => p.status === 'Shipped').length;
    const deliveredPurchaseOrders = purchaseOrders.filter((p) => p.status === 'Delivered').length;

    res.status(200).json({
      role,
      counts: {
        totalProducts,
        totalCustomers,
        totalSuppliers,
        totalOnHandStock,
        totalReservedStock,
        totalAvailableStock,
        lowStockCount: lowStockItems.length,
      },
      ordersPipeline: {
        sales: {
          pending: pendingSalesOrders,
          processing: processingSalesOrders,
          fulfilled: fulfilledSalesOrders,
          cancelled: salesOrders.filter((o) => o.status === 'Cancelled').length,
          total: salesOrders.length,
        },
        procurement: {
          pending: pendingPurchaseOrders,
          processing: processingPurchaseOrders,
          shipped: shippedPurchaseOrders,
          delivered: deliveredPurchaseOrders,
          cancelled: purchaseOrders.filter((p) => p.status === 'Cancelled').length,
          total: purchaseOrders.length,
        },
      },
      financials: {
        customerCollections,
        supplierPayments,
        netCashMovement,
        outstandingInvoices: {
          balance: outstandingInvoicesBalance,
          count: outstandingInvoicesList.length,
        },
        paidInvoices: {
          total: customerCollections,
          count: paidInvoicesList.length,
        },
        paidPurchaseOrders: {
          total: supplierPayments,
          count: paidPurchaseOrdersList.length,
        },
      },
      lowStockItems: lowStockItems.slice(0, 10),
      charts: {
        financeComparison: [
          { name: 'Collections vs Payments', Collections: customerCollections, Payments: supplierPayments },
        ],
        topProductsStock: products.slice(0, 8).map((p) => ({
          name: p.name.length > 12 ? p.name.substring(0, 12) + '..' : p.name,
          OnHand: p.onHand || p.stock || 0,
          Available: typeof p.available === 'number' ? p.available : p.stock || 0,
          ReorderLimit: p.reorderLevel,
        })),
      },
    });
  } catch (error) {
    console.error('Error computing dashboard summary:', error);
    res.status(500).json({ message: error.message || 'Failed to compute dashboard summary' });
  }
};
