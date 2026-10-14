import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import GRN from '../models/GRN.js';
import connectDB from '../config/db.js';

dotenv.config();

const isDryRun = process.argv.includes('--dry-run');

const STATUS_MAP = {
  'pending': 'Pending',
  'confirmed': 'Confirmed',
  'processing': 'Processing',
  'shipped': 'Shipped',
  'partially_received': 'Partially_Received',
  'partially received': 'Partially_Received',
  'delivered': 'Delivered',
  'completed': 'Delivered',
  'received': 'Delivered',
  'cancelled': 'Cancelled',
  'canceled': 'Cancelled',
};

async function migrate() {
  console.log(`\n======================================================`);
  console.log(`   ERP PROCUREMENT & LIFECYCLE DATA MIGRATION SCRIPT   `);
  console.log(`   Mode: ${isDryRun ? 'DRY-RUN (Preview Only, No Writes)' : 'LIVE EXECUTION'}`);
  console.log(`======================================================\n`);

  await connectDB();

  let poUpdatedCount = 0;
  let supplierUpdatedCount = 0;
  let grnUpdatedCount = 0;

  // 1. Migrate Suppliers
  console.log('--- Checking Suppliers ---');
  const suppliers = await Supplier.find({});
  for (const sup of suppliers) {
    let modified = false;
    if (sup.isActive === undefined) {
      sup.isActive = true;
      modified = true;
    }
    if (modified) {
      supplierUpdatedCount++;
      console.log(`[Supplier] ID ${sup._id} (${sup.name}) -> Setting isActive: true`);
      if (!isDryRun) {
        await sup.save();
      }
    }
  }

  // 2. Migrate Purchase Orders
  console.log('\n--- Checking Purchase Orders ---');
  const purchaseOrders = await PurchaseOrder.find({});
  for (const po of purchaseOrders) {
    let modified = false;

    // A. poNumber
    if (!po.poNumber) {
      const dateStr = (po.createdAt ? new Date(po.createdAt) : new Date()).toISOString().slice(0, 10).replace(/-/g, '');
      const hex = po._id.toString().slice(-4).toUpperCase();
      po.poNumber = `PO-${dateStr}-${hex}`;
      modified = true;
      console.log(`[PO] ID ${po._id} -> Generated poNumber: ${po.poNumber}`);
    }

    // B. Status normalisation
    if (po.status && STATUS_MAP[po.status.toLowerCase()] && STATUS_MAP[po.status.toLowerCase()] !== po.status) {
      const oldStatus = po.status;
      po.status = STATUS_MAP[po.status.toLowerCase()];
      modified = true;
      console.log(`[PO] ${po.poNumber} -> Normalized status from "${oldStatus}" to "${po.status}"`);
    }

    // C. paidAmount & paymentStatus consistency
    if (po.paidAmount === undefined) {
      if (po.paymentStatus === 'Paid') {
        po.paidAmount = po.TotalAmount || 0;
      } else {
        po.paidAmount = 0;
      }
      modified = true;
      console.log(`[PO] ${po.poNumber} -> Initialized paidAmount: ${po.paidAmount}`);
    }

    // D. statusHistory initialization
    if (!po.statusHistory || po.statusHistory.length === 0) {
      po.statusHistory = [
        {
          fromStatus: 'None',
          toStatus: po.status || 'Pending',
          changedAt: po.createdAt || new Date(),
          notes: 'Initial state restored by procurement workflow migration',
        },
      ];
      modified = true;
      console.log(`[PO] ${po.poNumber} -> Initialized statusHistory audit log`);
    }

    if (modified) {
      poUpdatedCount++;
      if (!isDryRun) {
        await po.save();
      }
    }
  }

  // 3. Migrate GRNs
  console.log('\n--- Checking Goods Receipt Notes (GRN) ---');
  const grns = await GRN.find({});
  for (const grn of grns) {
    let modified = false;

    // A. grnNumber
    if (!grn.grnNumber) {
      const dateStr = (grn.createdAt ? new Date(grn.createdAt) : new Date()).toISOString().slice(0, 10).replace(/-/g, '');
      const hex = grn._id.toString().slice(-4).toUpperCase();
      grn.grnNumber = `GRN-${dateStr}-${hex}`;
      modified = true;
      console.log(`[GRN] ID ${grn._id} -> Generated grnNumber: ${grn.grnNumber}`);
    }

    // B. Status normalisation
    if (grn.status === 'Received') {
      grn.status = 'Completed';
      modified = true;
    }

    // C. Line items accepted vs rejected
    if (grn.productsReceived && Array.isArray(grn.productsReceived)) {
      grn.productsReceived.forEach((item) => {
        const qty = item.quantity || item.receivedQuantity || item.acceptedQuantity || 0;
        if (item.orderedQuantity === undefined) {
          item.orderedQuantity = qty || 1;
          modified = true;
        }
        if (item.receivedQuantity === undefined) {
          item.receivedQuantity = qty;
          modified = true;
        }
        if (item.acceptedQuantity === undefined) {
          item.acceptedQuantity = qty;
          modified = true;
        }
        if (item.rejectedQuantity === undefined) {
          item.rejectedQuantity = 0;
          modified = true;
        }
      });
    }

    if (modified) {
      grnUpdatedCount++;
      console.log(`[GRN] ${grn.grnNumber || grn._id} -> Backfilled accepted & rejected quantities`);
      if (!isDryRun) {
        await grn.save();
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`   MIGRATION SUMMARY`);
  console.log(`   Suppliers Checked: ${suppliers.length} (Migrated: ${supplierUpdatedCount})`);
  console.log(`   Purchase Orders Checked: ${purchaseOrders.length} (Migrated: ${poUpdatedCount})`);
  console.log(`   GRNs Checked: ${grns.length} (Migrated: ${grnUpdatedCount})`);
  console.log(`   Mode: ${isDryRun ? 'DRY-RUN (No changes committed to database)' : 'CHANGES SAVED SUCCESSFULLY'}`);
  console.log(`======================================================\n`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
