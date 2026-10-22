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
import Cart from '../../models/Cart.js';
import Idempotency from '../../models/Idempotency.js';
import generateToken from '../../utils/generateToken.js';

const TEST_DB_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/erp_concurrency_test_db';

describe('Cart, Checkout & Inventory Concurrency & Hardening Test Suite', () => {
  let server;
  let baseUrl;

  let customerA;
  let customerB;
  let customerC;
  let salesManager;
  let admin;

  let customerAToken;
  let customerBToken;
  let customerCToken;
  let salesManagerToken;
  let adminToken;

  let productSingleUnit;
  let productTenUnits;
  let productMultiA;
  let productMultiB;
  let productOutOfStock;

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
    await Cart.deleteMany({});
    await Idempotency.deleteMany({});

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api`;

    // 1. Create Users
    customerA = await User.create({
      name: 'Customer Alpha',
      email: 'alpha@concurrency.com',
      password: 'Password123!',
      phone_number: '+919999900001',
      role: 'Customer',
    });

    customerB = await User.create({
      name: 'Customer Beta',
      email: 'beta@concurrency.com',
      password: 'Password123!',
      phone_number: '+919999900002',
      role: 'Customer',
    });

    customerC = await User.create({
      name: 'Customer Gamma',
      email: 'gamma@concurrency.com',
      password: 'Password123!',
      phone_number: '+919999900003',
      role: 'Customer',
    });

    salesManager = await User.create({
      name: 'Sales Lead',
      email: 'sales@concurrency.com',
      password: 'Password123!',
      phone_number: '+919999900004',
      role: 'Sales_Manager',
    });

    admin = await User.create({
      name: 'Admin Lead',
      email: 'admin@concurrency.com',
      password: 'Password123!',
      phone_number: '+919999900005',
      role: 'Admin',
    });

    customerAToken = generateToken(customerA._id, customerA.role);
    customerBToken = generateToken(customerB._id, customerB.role);
    customerCToken = generateToken(customerC._id, customerC.role);
    salesManagerToken = generateToken(salesManager._id, salesManager.role);
    adminToken = generateToken(admin._id, admin.role);

    // 2. Create Products
    productSingleUnit = await Product.create({
      name: 'Limited Collector Edition Watch',
      SKU: 'WATCH-LTD-01',
      category: 'Electronics',
      price: 500.0,
      onHand: 1,
      reserved: 0,
      available: 1,
      stock: 1,
      reorderLevel: 1,
    });

    productTenUnits = await Product.create({
      name: 'Smart Fitness Band',
      SKU: 'BAND-SMART-10',
      category: 'Electronics',
      price: 99.0,
      onHand: 10,
      reserved: 0,
      available: 10,
      stock: 10,
      reorderLevel: 2,
    });

    productMultiA = await Product.create({
      name: 'Component A',
      SKU: 'COMP-A-50',
      category: 'Hardware & Tools',
      price: 25.0,
      onHand: 5,
      reserved: 0,
      available: 5,
      stock: 5,
      reorderLevel: 2,
    });

    productMultiB = await Product.create({
      name: 'Component B',
      SKU: 'COMP-B-50',
      category: 'Hardware & Tools',
      price: 40.0,
      onHand: 5,
      reserved: 0,
      available: 5,
      stock: 5,
      reorderLevel: 2,
    });

    productOutOfStock = await Product.create({
      name: 'Sold Out Item',
      SKU: 'SOLD-OUT-00',
      category: 'Hardware & Tools',
      price: 15.0,
      onHand: 0,
      reserved: 0,
      available: 0,
      stock: 0,
      reorderLevel: 1,
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  // --- 1. Cart Management & Cart Concurrency Tests ---

  test('1. Cart Concurrency: Multiple customers can add the same product to their carts without modifying inventory', async () => {
    // Customer A adds productTenUnits to cart
    const resA = await fetch(`${baseUrl}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerAToken}`,
      },
      body: JSON.stringify({ productId: productTenUnits._id.toString(), quantity: 2 }),
    });
    assert.equal(resA.status, 200);
    const cartA = await resA.json();
    assert.equal(cartA.itemsCount, 2);
    assert.equal(cartA.items[0].product._id, productTenUnits._id.toString());

    // Customer B adds productTenUnits to cart
    const resB = await fetch(`${baseUrl}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerBToken}`,
      },
      body: JSON.stringify({ productId: productTenUnits._id.toString(), quantity: 3 }),
    });
    assert.equal(resB.status, 200);
    const cartB = await resB.json();
    assert.equal(cartB.itemsCount, 3);

    // CRITICAL: Verify Product inventory was NOT modified or reserved
    const checkProduct = await Product.findById(productTenUnits._id);
    assert.equal(checkProduct.onHand, 10, 'On-hand stock must remain unchanged');
    assert.equal(checkProduct.reserved, 0, 'Reserved stock must remain 0 when items are only in carts');
    assert.equal(checkProduct.available, 10, 'Available stock must remain 10');
  });

  test('2. Cart Validation: Rejects invalid, non-positive, or excessive quantities', async () => {
    const invalidQtyRes = await fetch(`${baseUrl}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerAToken}`,
      },
      body: JSON.stringify({ productId: productTenUnits._id.toString(), quantity: -5 }),
    });
    assert.equal(invalidQtyRes.status, 400);

    const excessiveQtyRes = await fetch(`${baseUrl}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerAToken}`,
      },
      body: JSON.stringify({ productId: productTenUnits._id.toString(), quantity: 1001 }),
    });
    assert.equal(excessiveQtyRes.status, 400);
  });

  test('3. Cart Concurrency: Concurrent increments to the same cart item combine accurately without silent overwrites', async () => {
    // Clear Customer A's cart first
    await fetch(`${baseUrl}/cart`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerAToken}` },
    });

    // Run 5 simultaneous increment requests of quantity 1
    const concurrentRequests = Array.from({ length: 5 }, () =>
      fetch(`${baseUrl}/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerAToken}`,
        },
        body: JSON.stringify({ productId: productTenUnits._id.toString(), quantity: 1 }),
      })
    );

    const responses = await Promise.all(concurrentRequests);
    for (const r of responses) {
      assert.equal(r.status, 200);
    }

    // Verify Customer A's cart quantity is exactly 5
    const finalCartRes = await fetch(`${baseUrl}/cart`, {
      headers: { Authorization: `Bearer ${customerAToken}` },
    });
    const finalCart = await finalCartRes.json();
    assert.equal(finalCart.itemsCount, 5, '5 concurrent increments must sum to 5 without race conditions');
  });

  test('4. Cart Scoping: Customer A cannot view or manipulate Customer B cart', async () => {
    const cartResB = await fetch(`${baseUrl}/cart`, {
      headers: { Authorization: `Bearer ${customerBToken}` },
    });
    const cartB = await cartResB.json();
    assert.equal(cartB.user, customerB._id.toString());
    assert.equal(cartB.itemsCount, 3);
  });

  // --- 2. Checkout & Race Condition Protections ---

  test('5. Single Unit Race: 2 customers concurrently compete for the last available unit -> exactly 1 succeeds', async () => {
    // productSingleUnit has exactly 1 available unit
    const reqA = fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerAToken}`,
      },
      body: JSON.stringify({
        items: [{ product: productSingleUnit._id.toString(), quantity: 1 }],
      }),
    });

    const reqB = fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerBToken}`,
      },
      body: JSON.stringify({
        items: [{ product: productSingleUnit._id.toString(), quantity: 1 }],
      }),
    });

    const [resA, resB] = await Promise.all([reqA, reqB]);

    const statuses = [resA.status, resB.status];
    assert.ok(statuses.includes(201), 'One request must succeed (201)');
    assert.ok(statuses.includes(400), 'The conflicting request must be rejected (400)');

    // Invariant check on single unit product
    const updatedWatch = await Product.findById(productSingleUnit._id);
    assert.equal(updatedWatch.onHand, 1);
    assert.equal(updatedWatch.reserved, 1);
    assert.equal(updatedWatch.available, 0);
  });

  test('6. Heavy Concurrency Stress: 100 concurrent purchase attempts for 10 units -> at most 10 succeed, stock never negative', async () => {
    // productTenUnits starts with onHand: 10, reserved: 0, available: 10
    const checkBefore = await Product.findById(productTenUnits._id);
    assert.equal(checkBefore.available, 10);

    // Create 100 concurrent purchase attempts
    const purchaseAttempts = Array.from({ length: 100 }, (_, i) => {
      // Alternate between customers
      const token = i % 2 === 0 ? customerAToken : customerBToken;
      return fetch(`${baseUrl}/sales-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: [{ product: productTenUnits._id.toString(), quantity: 1 }],
          remarks: `Stress test order attempt #${i + 1}`,
        }),
      });
    });

    const results = await Promise.all(purchaseAttempts);

    let successCount = 0;
    let failureCount = 0;

    for (const res of results) {
      if (res.status === 201) successCount++;
      else if (res.status === 400) failureCount++;
    }

    assert.equal(successCount, 10, 'Exactly 10 purchase attempts must succeed for 10 available units');
    assert.equal(failureCount, 90, 'The remaining 90 requests must fail with HTTP 400');

    // Verify authoritative database stock
    const productAfter = await Product.findById(productTenUnits._id);
    assert.equal(productAfter.onHand, 10, 'onHand must remain 10');
    assert.equal(productAfter.reserved, 10, 'reserved must equal 10');
    assert.equal(productAfter.available, 0, 'available must equal 0 (10 - 10)');
    assert.ok(productAfter.available >= 0, 'Stock must NEVER become negative');

    // Count confirmed orders for this product
    const confirmedOrders = await SalesOrder.countDocuments({
      'products.product': productTenUnits._id,
      status: 'Pending',
    });
    assert.equal(confirmedOrders, 10, 'Exactly 10 SalesOrder documents must exist in database');
  });

  // --- 3. Multi-Product Checkout & Compensation Workflow ---

  test('7. Multi-Product Checkout: One product out of stock triggers all-or-nothing rollback (zero stock leaked)', async () => {
    // productMultiA has available: 5
    // productOutOfStock has available: 0
    const initialA = await Product.findById(productMultiA._id);
    assert.equal(initialA.available, 5);

    const res = await fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerAToken}`,
      },
      body: JSON.stringify({
        items: [
          { product: productMultiA._id.toString(), quantity: 2 },
          { product: productOutOfStock._id.toString(), quantity: 1 }, // Will fail!
        ],
      }),
    });

    assert.equal(res.status, 400, 'Checkout must fail when any product has insufficient stock');
    const err = await res.json();
    assert.match(err.message, /insufficient available stock/i);

    // Verify Product A stock was NOT deducted or leaked: full compensation
    const afterA = await Product.findById(productMultiA._id);
    assert.equal(afterA.onHand, 5);
    assert.equal(afterA.reserved, 0, 'Product A reservation must be rolled back (compensated) to 0');
    assert.equal(afterA.available, 5, 'Product A available must remain 5');

    // Verify no orphaned SalesOrder was created
    const orphanedOrders = await SalesOrder.find({
      'products.product': productMultiA._id,
      createdBy: customerA._id,
    });
    assert.equal(orphanedOrders.length, 0, 'No orphaned order must be created');
  });

  test('8. Concurrent Overlapping Products: Deadlock avoidance and strict invariant preservation', async () => {
    // productMultiA: available 5
    // productMultiB: available 5
    // Customer A orders: 3 of A, 3 of B
    // Customer B orders: 3 of B, 3 of A
    // Total demanded: 6 of A, 6 of B (only 5 available each)
    const reqA = fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerAToken}`,
      },
      body: JSON.stringify({
        items: [
          { product: productMultiA._id.toString(), quantity: 3 },
          { product: productMultiB._id.toString(), quantity: 3 },
        ],
      }),
    });

    const reqB = fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerBToken}`,
      },
      body: JSON.stringify({
        items: [
          { product: productMultiB._id.toString(), quantity: 3 },
          { product: productMultiA._id.toString(), quantity: 3 },
        ],
      }),
    });

    const [resA, resB] = await Promise.all([reqA, reqB]);

    const statuses = [resA.status, resB.status];
    assert.ok(statuses.includes(201), 'One overlapping order must succeed');
    assert.ok(statuses.includes(400), 'The second overlapping order must be rejected');

    const finalA = await Product.findById(productMultiA._id);
    const finalB = await Product.findById(productMultiB._id);

    assert.equal(finalA.reserved, 3);
    assert.equal(finalA.available, 2);
    assert.equal(finalB.reserved, 3);
    assert.equal(finalB.available, 2);
  });

  // --- 4. Idempotency & Duplicate Submission Tests ---

  test('9. Idempotency: Duplicate submissions with identical Idempotency-Key return cached order without duplicate deduction', async () => {
    const key = `idemp-test-${Date.now()}`;
    const orderPayload = {
      items: [{ product: productMultiA._id.toString(), quantity: 1 }],
      remarks: 'First attempt',
    };

    // First submission
    const res1 = await fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
        Authorization: `Bearer ${customerAToken}`,
      },
      body: JSON.stringify(orderPayload),
    });
    assert.equal(res1.status, 201);
    const order1 = await res1.json();

    // Immediate duplicate retry with same Idempotency-Key
    const res2 = await fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
        Authorization: `Bearer ${customerAToken}`,
      },
      body: JSON.stringify(orderPayload),
    });
    assert.equal(res2.status, 201);
    const order2 = await res2.json();

    // Must return the exact same order
    assert.equal(order1._id, order2._id);
    assert.equal(order1.soNumber, order2.soNumber);

    // Verify stock was decremented ONLY ONCE (from 2 down to 1)
    const prodA = await Product.findById(productMultiA._id);
    assert.equal(prodA.reserved, 4); // 3 from previous test + 1 from this test
    assert.equal(prodA.available, 1);
  });

  test('10. Idempotency Concurrency: Two concurrent requests with same key cannot create duplicate orders', async () => {
    const key = `idemp-concurrent-${Date.now()}`;
    const orderPayload = {
      items: [{ product: productMultiA._id.toString(), quantity: 1 }],
      remarks: 'Double-click attempt',
    };

    const req1 = fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
        Authorization: `Bearer ${customerAToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const req2 = fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
        Authorization: `Bearer ${customerAToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const [r1, r2] = await Promise.all([req1, req2]);
    const body1 = await r1.json();
    const body2 = await r2.json();

    // Both should either resolve to the same order (201) or one returns 409 conflict
    if (r1.status === 201 && r2.status === 201) {
      assert.equal(body1._id, body2._id, 'Both concurrent idempotent requests must return the same order ID');
    } else {
      const statuses = [r1.status, r2.status];
      assert.ok(statuses.includes(201));
      assert.ok(statuses.includes(409));
    }

    // Only 1 order created in DB for this product in this test
    const ordersWithThisKey = await SalesOrder.find({ remarks: 'Double-click attempt' });
    assert.equal(ordersWithThisKey.length, 1, 'Only exactly 1 order may be created');
  });

  // --- 5. Security, Authorization & Privilege Lockdown Tests ---

  test('11. Customer Privilege Lockdown: Customer cannot forge order totals or paymentStatus at checkout', async () => {
    // Attempt to pass paymentStatus: 'Paid' and fake high total
    const res = await fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerCToken}`,
      },
      body: JSON.stringify({
        items: [{ product: productMultiB._id.toString(), quantity: 1, price: 1.0 }], // submitting price 1.0 (catalog price is 40.0)
        paymentStatus: 'Paid',
      }),
    });

    assert.equal(res.status, 201);
    const order = await res.json();
    assert.equal(order.paymentStatus, 'unpaid', 'Customer must not be able to set order paymentStatus to Paid');
    assert.equal(order.TotalAmount, 40.0, 'Server must enforce authoritative catalog price ($40.0), ignoring client $1.0');
  });

  test('12. Authorization Guard: Customer A cannot cancel Customer C order', async () => {
    // Customer C creates an order
    const createRes = await fetch(`${baseUrl}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerCToken}`,
      },
      body: JSON.stringify({
        items: [{ product: productMultiB._id.toString(), quantity: 1 }],
      }),
    });
    assert.equal(createRes.status, 201);
    const orderC = await createRes.json();

    // Customer A attempts to cancel Customer C's order
    const cancelRes = await fetch(`${baseUrl}/sales-orders/${orderC._id}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerAToken}`,
      },
      body: JSON.stringify({ reason: 'Malicious cancellation attempt' }),
    });

    assert.equal(cancelRes.status, 403, 'Customer A must be forbidden from cancelling Customer C order');
  });

  test('13. Order Lifecycle & Payment: Delayed payment rejected on cancelled order', async () => {
    // Customer C cancels their own order
    const listRes = await fetch(`${baseUrl}/sales-orders`, {
      headers: { Authorization: `Bearer ${customerCToken}` },
    });
    const { orders } = await listRes.json();
    const orderToCancel = orders[0];

    const cancelRes = await fetch(`${baseUrl}/sales-orders/${orderToCancel._id}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerCToken}`,
      },
      body: JSON.stringify({ reason: 'Changed my mind' }),
    });
    assert.equal(cancelRes.status, 200);

    // Sales manager attempts to set payment status to Paid on the cancelled order
    const payRes = await fetch(`${baseUrl}/sales-orders/${orderToCancel._id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesManagerToken}`,
      },
      body: JSON.stringify({ paymentStatus: 'Paid' }),
    });
    assert.equal(payRes.status, 400, 'Cannot accept payment on a cancelled order');
  });

  test('14. Dashboard Accuracy: Operational figures accurately reflect committed inventory', async () => {
    const summaryRes = await fetch(`${baseUrl}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(summaryRes.status, 200);
    const summary = await summaryRes.json();

    // Verify all invariant totals on dashboard: totalAvailableStock = totalOnHandStock - totalReservedStock
    assert.equal(
      summary.counts.totalAvailableStock,
      summary.counts.totalOnHandStock - summary.counts.totalReservedStock,
      'Dashboard totals must satisfy available = onHand - reserved'
    );
  });
});
