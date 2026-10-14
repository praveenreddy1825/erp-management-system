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
import Supplier from '../../models/Supplier.js';
import Contact from '../../models/Contact.js';
import PurchaseOrder from '../../models/PurchaseOrder.js';
import generateToken from '../../utils/generateToken.js';

const TEST_DB_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/erp_supplier_isolation_test_db';

describe('Supplier Multi-Tenant Isolation & PO Security Tests', () => {
  let server;
  let baseUrl;

  let supplierA;
  let supplierB;
  let supplierUserA;
  let supplierUserB;
  let tokenA;
  let tokenB;

  let productItem;
  let poA1;
  let poA2;
  let poB1;

  before(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(TEST_DB_URI);

    await User.deleteMany({});
    await Product.deleteMany({});
    await Supplier.deleteMany({});
    await Contact.deleteMany({});
    await PurchaseOrder.deleteMany({});

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api`;

    // 1. Create Product
    productItem = await Product.create({
      name: 'Steel Rods 10mm',
      SKU: 'SKU-STEEL-10',
      category: 'Industrial',
      price: 50,
      stock: 500,
      onHand: 500,
      reserved: 0,
      available: 500,
      reorderLevel: 20,
    });

    // 2. Create Supplier A
    const contactA = await Contact.create({
      email: 'vendorA@metals.com',
      phone_number: '+1111111111',
      address: { street: 'Industrial Area A' },
    });
    supplierA = await Supplier.create({
      name: 'Alpha Metal Corp',
      contactInfo: contactA._id,
      isActive: true,
    });

    supplierUserA = await User.create({
      name: 'Alpha Vendor Admin',
      email: 'vendorA@metals.com',
      password: 'VendorPassword@123',
      phone_number: '+1111111111',
      role: 'Supplier',
      supplierProfile: supplierA._id,
    });
    supplierA.userAccount = supplierUserA._id;
    await supplierA.save();
    tokenA = generateToken(supplierUserA._id, supplierUserA.role);

    // 3. Create Supplier B
    const contactB = await Contact.create({
      email: 'vendorB@timber.com',
      phone_number: '+2222222222',
      address: { street: 'Industrial Area B' },
    });
    supplierB = await Supplier.create({
      name: 'Beta Timber Industries',
      contactInfo: contactB._id,
      isActive: true,
    });

    supplierUserB = await User.create({
      name: 'Beta Vendor Admin',
      email: 'vendorB@timber.com',
      password: 'VendorPassword@123',
      phone_number: '+2222222222',
      role: 'Supplier',
      supplierProfile: supplierB._id,
    });
    supplierB.userAccount = supplierUserB._id;
    await supplierB.save();
    tokenB = generateToken(supplierUserB._id, supplierUserB.role);

    // 4. Create Purchase Orders
    // PO A1 for Supplier A ($500)
    poA1 = await PurchaseOrder.create({
      poNumber: 'PO-TEST-ALPHA-01',
      supplier: supplierA._id,
      products: [{ product: productItem._id, quantity: 10, price: 50 }],
      TotalAmount: 500,
      status: 'Pending',
      paymentStatus: 'unpaid',
      createdBy: supplierUserA._id,
    });

    // PO A2 for Supplier A ($1000)
    poA2 = await PurchaseOrder.create({
      poNumber: 'PO-TEST-ALPHA-02',
      supplier: supplierA._id,
      products: [{ product: productItem._id, quantity: 20, price: 50 }],
      TotalAmount: 1000,
      status: 'Confirmed',
      paymentStatus: 'unpaid',
      createdBy: supplierUserA._id,
    });

    // PO B1 for Supplier B ($750)
    poB1 = await PurchaseOrder.create({
      poNumber: 'PO-TEST-BETA-01',
      supplier: supplierB._id,
      products: [{ product: productItem._id, quantity: 15, price: 50 }],
      TotalAmount: 750,
      status: 'Pending',
      paymentStatus: 'unpaid',
      createdBy: supplierUserB._id,
    });
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const apiRequest = async (method, endpoint, token, body = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, data };
  };

  test('1. Supplier A can ONLY retrieve POs sent to Supplier A', async () => {
    const res = await apiRequest('GET', '/purchase-orders', tokenA);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.orders.length, 2);

    const poNumbers = res.data.orders.map((o) => o.poNumber);
    assert.ok(poNumbers.includes('PO-TEST-ALPHA-01'));
    assert.ok(poNumbers.includes('PO-TEST-ALPHA-02'));
    assert.ok(!poNumbers.includes('PO-TEST-BETA-01'), 'Supplier A must NEVER see PO belonging to Supplier B');
  });

  test('2. Supplier B can ONLY retrieve POs sent to Supplier B', async () => {
    const res = await apiRequest('GET', '/purchase-orders', tokenB);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.orders.length, 1);

    const poNumbers = res.data.orders.map((o) => o.poNumber);
    assert.ok(poNumbers.includes('PO-TEST-BETA-01'));
    assert.ok(!poNumbers.includes('PO-TEST-ALPHA-01'));
    assert.ok(!poNumbers.includes('PO-TEST-ALPHA-02'));
  });

  test('3. Query parameter manipulation (?supplier=ID) cannot bypass supplier isolation', async () => {
    // Supplier A tries to query Supplier B's orders using ?supplier=supplierB._id
    const res = await apiRequest('GET', `/purchase-orders?supplier=${supplierB._id}`, tokenA);
    assert.strictEqual(res.status, 200);
    // Must still return only Supplier A's orders!
    assert.strictEqual(res.data.orders.length, 2);
    const poNumbers = res.data.orders.map((o) => o.poNumber);
    assert.ok(!poNumbers.includes('PO-TEST-BETA-01'));
  });

  test('4. Supplier A attempting direct GET /api/purchase-orders/:id on Supplier B order is BLOCKED (403)', async () => {
    const res = await apiRequest('GET', `/purchase-orders/${poB1._id}`, tokenA);
    assert.strictEqual(res.status, 403);
    assert.ok(res.data.message.includes('Access denied'));
  });

  test('5. Supplier A attempting status transition on Supplier B order is BLOCKED (403)', async () => {
    const res = await apiRequest('PUT', `/purchase-orders/${poB1._id}/status`, tokenA, {
      status: 'Confirmed',
    });
    assert.strictEqual(res.status, 403);
    assert.ok(res.data.message.includes('Access denied'));
  });

  test('6. Supplier Dashboard metrics are strictly isolated to assigned POs', async () => {
    const resA = await apiRequest('GET', '/dashboard/summary', tokenA);
    assert.strictEqual(resA.status, 200);
    assert.strictEqual(resA.data.role, 'Supplier');
    assert.strictEqual(resA.data.totalPOs, 2);
    assert.strictEqual(resA.data.pendingPOs, 1); // PO-TEST-ALPHA-01
    assert.strictEqual(resA.data.confirmedPOs, 1); // PO-TEST-ALPHA-02

    const resB = await apiRequest('GET', '/dashboard/summary', tokenB);
    assert.strictEqual(resB.status, 200);
    assert.strictEqual(resB.data.role, 'Supplier');
    assert.strictEqual(resB.data.totalPOs, 1);
    assert.strictEqual(resB.data.pendingPOs, 1); // PO-TEST-BETA-01
    assert.strictEqual(resB.data.confirmedPOs, 0);
  });
});
