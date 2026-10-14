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

const TEST_DB_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/erp_customer_store_test_db';

describe('Customer Storefront, Cart Checkout & Role Lockdown Tests', () => {
  let server;
  let baseUrl;
  let customerAToken;
  let customerBToken;
  let managerToken;

  let customerA;
  let customerB;
  let manager;
  let productAtta;
  let productMilk;

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

    // 1. Create Users
    manager = await User.create({
      name: 'Store Manager',
      email: 'manager@store.com',
      password: 'Password123!',
      phone_number: '+919999999901',
      role: 'Sales_Manager',
    });

    customerA = await User.create({
      name: 'Ramesh Sharma',
      email: 'ramesh@quickstore.com',
      password: 'Password123!',
      phone_number: '+919876543210',
      role: 'Customer',
    });

    customerB = await User.create({
      name: 'Pooja Patel',
      email: 'pooja@quickstore.com',
      password: 'Password123!',
      phone_number: '+919876543211',
      role: 'Customer',
    });

    managerToken = generateToken(manager._id);
    customerAToken = generateToken(customerA._id);
    customerBToken = generateToken(customerB._id);

    // 2. Create Categorized Products
    productAtta = await Product.create({
      name: 'Aashirvaad Shudh Chakki Atta 5kg',
      SKU: 'GROC-ATTA-5K',
      category: 'Grocery',
      price: 245.0,
      stock: 50,
      onHand: 50,
      reserved: 0,
      available: 50,
      reorderLevel: 10,
    });

    productMilk = await Product.create({
      name: 'Amul Taaza Milk 1L',
      SKU: 'DAIRY-MILK-1L',
      category: 'Dairy',
      price: 54.0,
      stock: 30,
      onHand: 30,
      reserved: 0,
      available: 30,
      reorderLevel: 5,
    });
  });

  after(async () => {
    await server.close();
    await mongoose.disconnect();
  });

  test('1. Product Catalog: Customer can query products with category filtering and sorting', async () => {
    const res = await fetch(`${baseUrl}/products?category=Grocery&sortBy=updatedAt_desc`, {
      headers: { Authorization: `Bearer ${customerAToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.products.length, 1);
    assert.equal(data.products[0].name, 'Aashirvaad Shudh Chakki Atta 5kg');
    assert.ok(data.categories.includes('Grocery'));
    assert.ok(data.categories.includes('Dairy'));
  });

  test('2. Role Lockdown: Customer is FORBIDDEN (403) from accessing /api/customers', async () => {
    const res = await fetch(`${baseUrl}/customers`, {
      headers: { Authorization: `Bearer ${customerAToken}` },
    });
    assert.equal(res.status, 403, 'Customer should receive HTTP 403 on /api/customers');
  });

  test('3. Storefront Checkout: Customer A places cart order (auto-resolves customer & reserves stock)', async () => {
    const orderPayload = {
      items: [
        { product: productAtta._id.toString(), quantity: 3, price: 245.0 },
        { product: productMilk._id.toString(), quantity: 2, price: 54.0 },
      ],
      remarks: 'Leave with security at main gate',
    };

    const res = await fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerAToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    assert.equal(res.status, 201);
    const order = await res.json();
    assert.ok(order._id);
    assert.equal(order.status, 'Pending');
    assert.equal(order.TotalAmount, 3 * 245.0 + 2 * 54.0); // 735 + 108 = 843

    // Verify atomic inventory reservation
    const updatedAtta = await Product.findById(productAtta._id);
    assert.equal(updatedAtta.onHand, 50);
    assert.equal(updatedAtta.reserved, 3);
    assert.equal(updatedAtta.available, 47);

    const updatedMilk = await Product.findById(productMilk._id);
    assert.equal(updatedMilk.onHand, 30);
    assert.equal(updatedMilk.reserved, 2);
    assert.equal(updatedMilk.available, 28);
  });

  test('4. Order Isolation: Customer A sees their order; Customer B sees 0 orders', async () => {
    // Customer A queries
    const resA = await fetch(`${baseUrl}/sales-orders`, {
      headers: { Authorization: `Bearer ${customerAToken}` },
    });
    assert.equal(resA.status, 200);
    const dataA = await resA.json();
    assert.equal(dataA.orders.length, 1);

    // Customer B queries
    const resB = await fetch(`${baseUrl}/sales-orders`, {
      headers: { Authorization: `Bearer ${customerBToken}` },
    });
    assert.equal(resB.status, 200);
    const dataB = await resB.json();
    assert.equal(dataB.orders.length, 0, 'Customer B must not see Customer A orders');
  });

  test('5. Out of Stock Protection: Ordering more than available stock is rejected (400)', async () => {
    const excessivePayload = {
      items: [
        { product: productAtta._id.toString(), quantity: 50, price: 245.0 }, // Only 47 available
      ],
    };

    const res = await fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerAToken}`,
      },
      body: JSON.stringify(excessivePayload),
    });

    assert.equal(res.status, 400);
    const err = await res.json();
    assert.ok(err.message.includes('Insufficient available stock'));
  });
});
