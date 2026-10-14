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
import GRN from '../../models/GRN.js';
import generateToken from '../../utils/generateToken.js';

const TEST_DB_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/erp_procurement_test_db';

describe('End-to-End Procurement, PO, GRN & Inventory Workflow Integration Tests', () => {
    let server;
    let baseUrl;
    let adminToken;
    let purchaseManagerToken;
    let inventoryManagerToken;
    let customerToken;

    let adminUser;
    let purchaseUser;
    let inventoryUser;
    let customerUser;

    let productA;
    let productB;
    let createdSupplier;
    let createdPurchaseOrder;

    before(async () => {
        // Connect to isolated test database
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        await mongoose.connect(TEST_DB_URI);

        // Clear test collections
        await User.deleteMany({});
        await Product.deleteMany({});
        await Supplier.deleteMany({});
        await Contact.deleteMany({});
        await PurchaseOrder.deleteMany({});
        await GRN.deleteMany({});

        // Start HTTP test server on ephemeral free port
        server = http.createServer(app);
        await new Promise((resolve) => server.listen(0, resolve));
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;

        // Seed Users
        adminUser = await User.create({
            name: 'System Admin',
            email: 'admin@erp-test.com',
            password: 'AdminPassword@123',
            phone_number: '+1234567890',
            role: 'Admin'
        });
        adminToken = generateToken(adminUser._id, adminUser.role);

        purchaseUser = await User.create({
            name: 'Purchase Lead',
            email: 'purchase@erp-test.com',
            password: 'PurchasePassword@123',
            phone_number: '+1234567891',
            role: 'Purchase_Manager'
        });
        purchaseManagerToken = generateToken(purchaseUser._id, purchaseUser.role);

        inventoryUser = await User.create({
            name: 'Warehouse Lead',
            email: 'warehouse@erp-test.com',
            password: 'WarehousePassword@123',
            phone_number: '+1234567892',
            role: 'Inventory_Manager'
        });
        inventoryManagerToken = generateToken(inventoryUser._id, inventoryUser.role);

        customerUser = await User.create({
            name: 'Regular Customer',
            email: 'customer@erp-test.com',
            password: 'CustomerPassword@123',
            phone_number: '+1234567893',
            role: 'Customer'
        });
        customerToken = generateToken(customerUser._id, customerUser.role);

        // Seed Products with known initial stock
        productA = await Product.create({
            name: 'Industrial Valve A',
            SKU: 'SKU-VALVE-A',
            category: 'Valves',
            price: 25.00,
            stock: 50,
            reorderLevel: 10
        });

        productB = await Product.create({
            name: 'Hydraulic Flange B',
            SKU: 'SKU-FLANGE-B',
            category: 'Pipes',
            price: 40.00,
            stock: 100,
            reorderLevel: 20
        });
    });

    after(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.db.dropDatabase();
            await mongoose.disconnect();
        }
    });

    test('1. Supplier Management: Create supplier and verify NO User login account is created', async () => {
        const payload = {
            name: 'Apex Industrial Supply Co',
            email: 'Apex.Sales@ApexSupply.com',
            phone_number: '+1987654321',
            address: {
                street: '100 Industrial Parkway',
                city: 'Chicago',
                state: 'IL',
                zipCode: '60601',
                country: 'USA'
            },
            notes: 'Preferred vendor for hydraulic components'
        };

        const res = await fetch(`${baseUrl}/suppliers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify(payload)
        });

        assert.equal(res.status, 201, 'Supplier should be created with status 201');
        const data = await res.json();
        assert.ok(data._id, 'Supplier should have an ID');
        assert.equal(data.name, 'Apex Industrial Supply Co');
        assert.equal(data.isActive, true, 'Supplier should be active by default');
        createdSupplier = data;

        // CRITICAL ERP DOMAIN CHECK: No User account should exist for this supplier
        const userFound = await User.findOne({ email: 'apex.sales@apexsupply.com' });
        assert.equal(userFound, null, 'Suppliers must NOT have an automatic User login record created');
    });

    test('2. Supplier Management: Duplicate email rejection', async () => {
        const duplicatePayload = {
            name: 'Duplicate Apex Supply',
            email: 'apex.sales@apexsupply.com', // normalized duplicate
            phone_number: '+1987654322',
            address: { street: '200 Industrial Way' }
        };

        const res = await fetch(`${baseUrl}/suppliers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify(duplicatePayload)
        });

        assert.equal(res.status, 400, 'Duplicate supplier email must return status 400');
        const data = await res.json();
        assert.match(data.message, /already registered|already exists/i);
    });

    test('3. Supplier Management: Role-based authorization controls', async () => {
        // Customer role trying to create supplier
        const resUnauthorized = await fetch(`${baseUrl}/suppliers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`
            },
            body: JSON.stringify({ name: 'Hacker Supplies', email: 'hacker@supplies.com', phone_number: '+1000000000' })
        });
        assert.equal(resUnauthorized.status, 403, 'Customer role must be forbidden from creating suppliers');

        // Unauthenticated request
        const resNoAuth = await fetch(`${baseUrl}/suppliers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'No Auth Supplies', email: 'noauth@supplies.com', phone_number: '+1000000000' })
        });
        assert.equal(resNoAuth.status, 401, 'Unauthenticated request must return 401');
    });

    test('4. Purchase Order Creation: Server calculates totals & verifies stock neutrality', async () => {
        const poPayload = {
            supplier: createdSupplier._id,
            items: [
                {
                    product: productA._id,
                    quantity: 20,
                    purchasePrice: 25.00
                },
                {
                    product: productB._id,
                    quantity: 10,
                    purchasePrice: 40.00
                }
            ],
            notes: 'Q4 bulk valve and flange procurement',
            expectedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
            // Intentionally send forged client totals to test server-side authority
            subtotal: 10,
            taxAmount: 1,
            TotalAmount: 11
        };

        const res = await fetch(`${baseUrl}/purchase-orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify(poPayload)
        });

        assert.equal(res.status, 201, 'Purchase Order should be created with status 201');
        const data = await res.json();
        createdPurchaseOrder = data;

        assert.ok(data.poNumber.startsWith('PO-'), 'PO should have a human-readable PO number');
        assert.equal(data.status, 'Pending', 'Initial status must be Pending');

        // Verify Server-Side Financial Calculations:
        // Item 1: 20 * 25.00 = 500.00
        // Item 2: 10 * 40.00 = 400.00
        // Expected Total = 900.00
        assert.equal(data.TotalAmount, 900, 'TotalAmount must be accurately computed by server (500 + 400 = 900)');

        // CRITICAL INVENTORY RULE: Creating a PO must NOT modify warehouse stock!
        const checkProductA = await Product.findById(productA._id);
        const checkProductB = await Product.findById(productB._id);
        assert.equal(checkProductA.stock, 50, 'Product A stock must remain untouched at 50');
        assert.equal(checkProductB.stock, 100, 'Product B stock must remain untouched at 100');
    });

    test('5. Purchase Order Creation: Validation safeguards', async () => {
        // Non-existent supplier
        const resInvalidSupplier = await fetch(`${baseUrl}/purchase-orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify({
                supplier: new mongoose.Types.ObjectId(),
                items: [{ product: productA._id, quantity: 5, purchasePrice: 20 }]
            })
        });
        assert.equal(resInvalidSupplier.status, 404, 'Non-existent supplier must be rejected');

        // Empty items array
        const resEmptyItems = await fetch(`${baseUrl}/purchase-orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify({
                supplier: createdSupplier._id,
                items: []
            })
        });
        assert.equal(resEmptyItems.status, 400, 'Empty items array must return 400');

        // Negative quantity
        const resNegQty = await fetch(`${baseUrl}/purchase-orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify({
                supplier: createdSupplier._id,
                items: [{ product: productA._id, quantity: -5, purchasePrice: 20 }]
            })
        });
        assert.equal(resNegQty.status, 400, 'Negative quantity must return 400');
    });

    test('6. Supplier Deletion Safety: Historical POs prevent hard deletion (Soft Deactivation)', async () => {
        const res = await fetch(`${baseUrl}/suppliers/${createdSupplier._id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.action, 'deactivated', 'Supplier with historical POs must be deactivated, not hard deleted');

        // Verify in DB that supplier is still present but inactive
        const dbSupplier = await Supplier.findById(createdSupplier._id);
        assert.ok(dbSupplier, 'Supplier document must remain in DB');
        assert.equal(dbSupplier.isActive, false, 'Supplier isActive must be false');
    });

    test('7. PO Lifecycle State Machine: Valid transitions and rejection of invalid direct delivery', async () => {
        // Attempt invalid jump: Pending directly to Delivered
        const resInvalidJump = await fetch(`${baseUrl}/purchase-orders/${createdPurchaseOrder._id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify({ status: 'Delivered' })
        });
        assert.equal(resInvalidJump.status, 400, 'Direct transition to Delivered via status update must be rejected');

        // Step 1: Pending -> Confirmed
        const resConfirmed = await fetch(`${baseUrl}/purchase-orders/${createdPurchaseOrder._id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify({
                status: 'Confirmed',
                notes: 'Supplier acknowledged order via email on 2026-10-14'
            })
        });
        assert.equal(resConfirmed.status, 200);
        const confirmedData = await resConfirmed.json();
        assert.equal(confirmedData.status, 'Confirmed');

        // Step 2: Confirmed -> Processing
        const resProcessing = await fetch(`${baseUrl}/purchase-orders/${createdPurchaseOrder._id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify({ status: 'Processing', notes: 'Vendor packing goods' })
        });
        assert.equal(resProcessing.status, 200);

        // Step 3: Processing -> Shipped
        const resShipped = await fetch(`${baseUrl}/purchase-orders/${createdPurchaseOrder._id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify({
                status: 'Shipped',
                carrier: 'Apex Logistics Freight',
                trackingNumber: 'AL-7890123',
                notes: 'Consignment dispatched from warehouse Chicago'
            })
        });
        assert.equal(resShipped.status, 200);
        const shippedData = await resShipped.json();
        assert.equal(shippedData.status, 'Shipped');
        assert.equal(shippedData.trackingNumber, 'AL-7890123');

        // Attempt invalid backwards transition: Shipped -> Confirmed
        const resInvalidBack = await fetch(`${baseUrl}/purchase-orders/${createdPurchaseOrder._id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify({ status: 'Confirmed' })
        });
        assert.equal(resInvalidBack.status, 400, 'Backward transition to Confirmed must be rejected');

        // Verify audit trail statusHistory
        const auditPO = await PurchaseOrder.findById(createdPurchaseOrder._id);
        assert.ok(auditPO.statusHistory.length >= 4, 'Status history must record each transition');
    });

    test('8. Goods Receipt Note (GRN): Partial delivery, accepted vs rejected stock intake', async () => {
        // First receipt: Partial delivery
        // Product A: Ordered 20. Received 12 (10 Accepted, 2 Rejected due to damage)
        // Product B: Ordered 10. Received 5 (5 Accepted, 0 Rejected)
        const grnPayload = {
            purchaseOrder: createdPurchaseOrder._id,
            receivedItems: [
                {
                    product: productA._id,
                    orderedQuantity: 20,
                    receivedQuantity: 12,
                    acceptedQuantity: 10,
                    rejectedQuantity: 2,
                    rejectionReason: 'Damaged flange seal in box 1'
                },
                {
                    product: productB._id,
                    orderedQuantity: 10,
                    receivedQuantity: 5,
                    acceptedQuantity: 5,
                    rejectedQuantity: 0
                }
            ],
            deliveryReference: 'DEL-INV-9901',
            packingSlipNumber: 'PS-77441',
            remarks: 'First partial consignment received at Dock 4'
        };

        const res = await fetch(`${baseUrl}/grns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${inventoryManagerToken}`
            },
            body: JSON.stringify(grnPayload)
        });

        assert.equal(res.status, 201, 'GRN should be created with status 201');
        const grnData = await res.json();
        assert.ok(grnData.grnNumber.startsWith('GRN-'), 'GRN should have a unique grnNumber');

        // CRITICAL INVENTORY VERIFICATION:
        // Product A stock was 50. Accepted: 10, Rejected: 2.
        // Stock must be EXACTLY 50 + 10 = 60! The 2 rejected units must NEVER inflate inventory!
        const stockA = await Product.findById(productA._id);
        assert.equal(stockA.stock, 60, 'Product A stock must increment ONLY by acceptedQuantity (50 -> 60)');

        // Product B stock was 100. Accepted: 5.
        // Stock must be EXACTLY 100 + 5 = 105!
        const stockB = await Product.findById(productB._id);
        assert.equal(stockB.stock, 105, 'Product B stock must increment by acceptedQuantity (100 -> 105)');

        // Purchase Order Status must now be Partially_Received
        const updatedPO = await PurchaseOrder.findById(createdPurchaseOrder._id);
        assert.equal(updatedPO.status, 'Partially_Received', 'PO must transition to Partially_Received');
    });

    test('9. Goods Receipt Note (GRN): Over-receipt guard', async () => {
        // Product A: 20 ordered, 10 accepted so far, 10 remaining.
        // Attempting to accept 15 units exceeds remaining 10!
        const overReceiptPayload = {
            purchaseOrder: createdPurchaseOrder._id,
            receivedItems: [
                {
                    product: productA._id,
                    receivedQuantity: 15,
                    acceptedQuantity: 15,
                    rejectedQuantity: 0
                }
            ]
        };

        const res = await fetch(`${baseUrl}/grns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${inventoryManagerToken}`
            },
            body: JSON.stringify(overReceiptPayload)
        });

        assert.equal(res.status, 400, 'Over-receipt must return status 400');
        const errorData = await res.json();
        assert.match(errorData.message, /exceeds remaining balance/i);
    });

    test('10. Goods Receipt Note (GRN): Second receipt fulfilling order & transitioning to Delivered', async () => {
        // Fulfill remaining quantities:
        // Product A remaining: 10. Accept 10.
        // Product B remaining: 5. Accept 5.
        const finalGrnPayload = {
            purchaseOrder: createdPurchaseOrder._id,
            receivedItems: [
                {
                    product: productA._id,
                    orderedQuantity: 20,
                    receivedQuantity: 10,
                    acceptedQuantity: 10,
                    rejectedQuantity: 0
                },
                {
                    product: productB._id,
                    orderedQuantity: 10,
                    receivedQuantity: 5,
                    acceptedQuantity: 5,
                    rejectedQuantity: 0
                }
            ],
            deliveryReference: 'DEL-INV-9902',
            packingSlipNumber: 'PS-77442',
            remarks: 'Final consignment received and inspected'
        };

        const res = await fetch(`${baseUrl}/grns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${inventoryManagerToken}`
            },
            body: JSON.stringify(finalGrnPayload)
        });

        assert.equal(res.status, 201, 'Final GRN should be recorded');

        // Verify Final Stock:
        // Product A: 60 + 10 = 70.
        // Product B: 105 + 5 = 110.
        const stockA = await Product.findById(productA._id);
        const stockB = await Product.findById(productB._id);
        assert.equal(stockA.stock, 70, 'Final stock for Product A must equal initial (50) + total accepted (20) = 70');
        assert.equal(stockB.stock, 110, 'Final stock for Product B must equal initial (100) + total accepted (10) = 110');

        // Verify PO transitioned to Delivered
        const finalPO = await PurchaseOrder.findById(createdPurchaseOrder._id);
        assert.equal(finalPO.status, 'Delivered', 'PO must reach Delivered once all quantities are accepted');
    });

    test('11. Goods Receipt Note (GRN): Reject receipt against fully delivered PO', async () => {
        const extraPayload = {
            purchaseOrder: createdPurchaseOrder._id,
            receivedItems: [
                {
                    product: productA._id,
                    receivedQuantity: 1,
                    acceptedQuantity: 1,
                    rejectedQuantity: 0
                }
            ]
        };

        const res = await fetch(`${baseUrl}/grns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${inventoryManagerToken}`
            },
            body: JSON.stringify(extraPayload)
        });

        assert.equal(res.status, 400, 'Receipt against fully delivered PO must be rejected');
    });

    test('12. Payment Tracking: Partial payment, overpayment rejection, and fulfillment independence', async () => {
        // Total amount is 1062. Initial paidAmount is 0.
        // Record partial payment of $500.
        const payRes1 = await fetch(`${baseUrl}/purchase-orders/${createdPurchaseOrder._id}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify({
                amount: 500,
                paymentMethod: 'Bank Transfer',
                referenceNumber: 'WIRE-2026-001',
                notes: 'First installment 500 USD'
            })
        });

        assert.ok([200, 201].includes(payRes1.status), 'Partial payment should be recorded');
        const payData1 = await payRes1.json();
        assert.equal(payData1.paidAmount, 500);
        assert.equal(payData1.paymentStatus, 'partial');
        assert.equal(payData1.order.payments.length, 1);

        // Overpayment test: Outstanding is 900 - 500 = 400.
        // Attempting to pay $500 must be rejected.
        const payResOver = await fetch(`${baseUrl}/purchase-orders/${createdPurchaseOrder._id}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify({
                amount: 500,
                paymentMethod: 'Bank Transfer',
                referenceNumber: 'WIRE-2026-OVER'
            })
        });
        assert.equal(payResOver.status, 400, 'Overpayment must be rejected');
        const overErr = await payResOver.json();
        assert.match(overErr.message, /exceeds.*outstanding balance/i);

        // Negative payment test
        const payResNeg = await fetch(`${baseUrl}/purchase-orders/${createdPurchaseOrder._id}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify({
                amount: -100,
                paymentMethod: 'Cash'
            })
        });
        assert.equal(payResNeg.status, 400, 'Negative payment must be rejected');

        // Settle remaining balance of 400
        const payResFinal = await fetch(`${baseUrl}/purchase-orders/${createdPurchaseOrder._id}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${purchaseManagerToken}`
            },
            body: JSON.stringify({
                amount: 400,
                paymentMethod: 'Bank Transfer',
                referenceNumber: 'WIRE-2026-FINAL',
                notes: 'Final settlement'
            })
        });
        assert.ok([200, 201].includes(payResFinal.status));
        const finalPayData = await payResFinal.json();
        assert.equal(finalPayData.paidAmount, 900);
        assert.equal(finalPayData.paymentStatus, 'Paid');

        // CRITICAL INDEPENDENCE CHECK: Fulfillment status must remain Delivered
        assert.equal(finalPayData.order.status, 'Delivered', 'Payment recording must NOT overwrite order fulfillment status');
    });

    test('13. Application Security: Public self-registration cannot grant privileged roles', async () => {
        const maliciousPayload = {
            name: 'Evil Admin Attempt',
            email: 'hacker-admin@erp.com',
            password: 'HackerPassword@123',
            phone_number: '+1999888777',
            role: 'Admin'
        };

        const res = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(maliciousPayload)
        });

        assert.equal(res.status, 403, 'Public registration requesting Admin role must be blocked');
        const data = await res.json();
        assert.match(data.message, /privileged roles is not permitted/i);
    });
});
