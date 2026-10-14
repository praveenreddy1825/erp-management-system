import dotenv from 'dotenv';
dotenv.config();
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'this_is_super_confidential_keep_it_private';
}
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../../app.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import Customer from '../../models/Customer.js';
import Contact from '../../models/Contact.js';
import SalesOrder from '../../models/SalesOrder.js';
import Invoice from '../../models/Invoice.js';
import StockMovement from '../../models/StockMovement.js';
import generateToken from '../../utils/generateToken.js';

const TEST_DB_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/erp_sales_test_db';

describe('Sales Order, 3-Tier Reservation, Fulfillment, Invoicing & Dashboard Integration Tests', () => {
  let server;
  let baseUrl;
  let adminToken;
  let salesManagerToken;
  let customerToken;

  let adminUser;
  let salesUser;
  let customerUser;
  let customerProfile;

  let testProduct;

  before(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(TEST_DB_URI);

    await User.deleteMany({});
    await Product.deleteMany({});
    await Customer.deleteMany({});
    await Contact.deleteMany({});
    await SalesOrder.deleteMany({});
    await Invoice.deleteMany({});
    await StockMovement.deleteMany({});

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api`;

    adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@sales-test.com',
      password: 'AdminPassword@123',
      phone_number: '+1234567890',
      role: 'Admin',
    });
    adminToken = generateToken(adminUser._id, adminUser.role);

    salesUser = await User.create({
      name: 'Sales Manager',
      email: 'sales@sales-test.com',
      password: 'SalesPassword@123',
      phone_number: '+1234567891',
      role: 'Sales_Manager',
    });
    salesManagerToken = generateToken(salesUser._id, salesUser.role);

    customerUser = await User.create({
      name: 'Acme Client',
      email: 'acme@client.com',
      password: 'CustomerPassword@123',
      phone_number: '+1234567892',
      role: 'Customer',
    });
    customerToken = generateToken(customerUser._id, customerUser.role);

    const contact = await Contact.create({
      email: customerUser.email,
      phone_number: customerUser.phone_number,
      address: '100 Acme Way, Metropolis',
    });

    customerProfile = await Customer.create({
      name: 'Acme Corporation',
      contactInfo: contact._id,
      paymentTerms: 'Net 30',
    });

    testProduct = await Product.create({
      name: 'High Precision Sensor X',
      SKU: 'SKU-SENSOR-X',
      category: 'Electronics',
      price: 150.0,
      costPrice: 90.0,
      onHand: 100,
      reserved: 0,
      available: 100,
      stock: 100,
      reorderLevel: 15,
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  let createdOrderId;
  let orderTotal;

  test('1. Inventory Invariants: Product correctly initializes onHand=100, reserved=0, available=100', async () => {
    const prod = await Product.findById(testProduct._id);
    assert.equal(prod.onHand, 100);
    assert.equal(prod.reserved, 0);
    assert.equal(prod.available, 100);
  });

  test('2. Order Placement & Reservation: Customer creates Sales Order for 20 units', async () => {
    const res = await fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        customer: customerProfile._id,
        products: [{ product: testProduct._id, quantity: 20 }],
        remarks: 'Urgent sensor shipment required',
      }),
    });

    assert.equal(res.status, 201, 'Sales Order should be created');
    const data = await res.json();
    createdOrderId = data._id;
    orderTotal = data.TotalAmount;

    assert.equal(data.status, 'Pending');
    assert.equal(data.reservationStatus, 'Reserved');
    assert.equal(data.TotalAmount, 20 * 150.0);
    assert.ok(data.soNumber.startsWith('SO-'));

    // Check inventory: physical onHand must remain 100, reserved becomes 20, available becomes 80
    const prod = await Product.findById(testProduct._id);
    assert.equal(prod.onHand, 100, 'Physical warehouse stock must remain constant at 100 during reservation');
    assert.equal(prod.reserved, 20, 'Reserved stock should increment to 20');
    assert.equal(prod.available, 80, 'Available stock should decrement to 80 (100 - 20)');

    // Verify StockMovement audit log
    const movements = await StockMovement.find({ sourceDocumentId: data._id });
    assert.equal(movements.length, 1);
    assert.equal(movements[0].movementType, 'Order_Reservation');
    assert.equal(movements[0].quantity, 20);
    assert.equal(movements[0].availableBefore, 100);
    assert.equal(movements[0].availableAfter, 80);
  });

  test('3. Stock Boundary Guard: Attempting to order 85 units when only 80 are available must fail', async () => {
    const res = await fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        customer: customerProfile._id,
        products: [{ product: testProduct._id, quantity: 85 }],
      }),
    });

    assert.equal(res.status, 400, 'Insufficient stock should return 400');
    const err = await res.json();
    assert.match(err.message, /insufficient available stock/i);
  });

  test('4. Order Lifecycle: Sales Manager confirms and advances order to Processing', async () => {
    const resConfirm = await fetch(`${baseUrl}/sales-orders/${createdOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesManagerToken}`,
      },
      body: JSON.stringify({ status: 'Confirmed' }),
    });
    assert.equal(resConfirm.status, 200);

    const resProcess = await fetch(`${baseUrl}/sales-orders/${createdOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesManagerToken}`,
      },
      body: JSON.stringify({ status: 'Processing' }),
    });
    assert.equal(resProcess.status, 200);

    // Customer can no longer cancel a Processing order
    const resCancel = await fetch(`${baseUrl}/sales-orders/${createdOrderId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ reason: 'Customer tried to cancel late' }),
    });
    assert.equal(resCancel.status, 400, 'Customer cannot cancel once order is processing');
  });

  test('5. Fulfillment & Physical Stock Deduction: Sales Manager fulfills order', async () => {
    const resFulfill = await fetch(`${baseUrl}/sales-orders/${createdOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesManagerToken}`,
      },
      body: JSON.stringify({ status: 'Fulfilled' }),
    });

    assert.equal(resFulfill.status, 200);
    const data = await resFulfill.json();
    assert.equal(data.status, 'Fulfilled');
    assert.equal(data.reservationStatus, 'Fulfilled');

    // Physical onHand reduces from 100 to 80; reserved releases from 20 to 0; available stays 80
    const prod = await Product.findById(testProduct._id);
    assert.equal(prod.onHand, 80, 'Physical stock reduced to 80 upon fulfillment');
    assert.equal(prod.reserved, 0, 'Reserved stock released back to 0');
    assert.equal(prod.available, 80, 'Available stock remains 80 (80 - 0)');

    // Verify Sales_Fulfillment movement logged
    const movements = await StockMovement.find({ sourceDocumentId: createdOrderId, movementType: 'Sales_Fulfillment' });
    assert.equal(movements.length, 1);
    assert.equal(movements[0].quantity, -20);
    assert.equal(movements[0].onHandBefore, 100);
    assert.equal(movements[0].onHandAfter, 80);
  });

  let createdInvoiceId;

  test('6. Post-Fulfillment Invoicing: Sales Manager generates Commercial Invoice', async () => {
    const res = await fetch(`${baseUrl}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesManagerToken}`,
      },
      body: JSON.stringify({
        salesOrder: createdOrderId,
        remarks: 'Commercial invoice for fulfilled sensor delivery',
      }),
    });

    assert.equal(res.status, 201, 'Invoice should be created');
    const data = await res.json();
    createdInvoiceId = data._id;
    assert.equal(data.paymentStatus, 'Unpaid');
    assert.equal(data.totalAmount, orderTotal);
    assert.ok(data.invoiceNumber.startsWith('INV-'));

    // Attempting to duplicate invoice for same order must fail
    const resDup = await fetch(`${baseUrl}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesManagerToken}`,
      },
      body: JSON.stringify({ salesOrder: createdOrderId }),
    });
    assert.equal(resDup.status, 400, 'Duplicate invoice generation must be prevented');
  });

  test('7. Customer Payment: Sales Manager records exact full payment on invoice', async () => {
    // Attempting partial payment fails
    const resPartial = await fetch(`${baseUrl}/invoices/${createdInvoiceId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesManagerToken}`,
      },
      body: JSON.stringify({
        amount: orderTotal / 2,
        paymentMethod: 'Wire Transfer',
      }),
    });
    assert.equal(resPartial.status, 400, 'Partial customer payments must be rejected');

    // Record exact full payment
    const resFull = await fetch(`${baseUrl}/invoices/${createdInvoiceId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesManagerToken}`,
      },
      body: JSON.stringify({
        amount: orderTotal,
        paymentMethod: 'Bank Transfer',
        reference: 'ACME-PAY-2026-99',
      }),
    });
    assert.equal(resFull.status, 200, 'Full payment recording should succeed');
    const data = await resFull.json();
    assert.equal(data.invoice.paymentStatus, 'Paid');
    assert.equal(data.invoice.paidAmount, orderTotal);

    // Verify linked Sales Order synchronized to Paid
    const orderDoc = await SalesOrder.findById(createdOrderId);
    assert.equal(orderDoc.paymentStatus, 'Paid', 'Linked Sales Order must sync paymentStatus to Paid');
  });

  test('8. Operational Dashboard Summary: Server computes accurate financial & inventory KPIs', async () => {
    const res = await fetch(`${baseUrl}/dashboard/summary`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 200);
    const summary = await res.json();

    assert.equal(summary.financials.customerCollections, orderTotal, 'Customer collections must match paid invoice total');
    assert.equal(summary.financials.outstandingInvoices.balance, 0, 'No outstanding balance remaining');
    assert.equal(summary.counts.totalOnHandStock, 80);
    assert.equal(summary.counts.totalReservedStock, 0);
    assert.equal(summary.counts.totalAvailableStock, 80);
    assert.equal(summary.ordersPipeline.sales.fulfilled, 1);
  });
});
