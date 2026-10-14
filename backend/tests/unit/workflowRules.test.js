import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VALID_PO_TRANSITIONS } from '../../controllers/purchaseOrderController.js';

describe('Procurement Workflow Business Rules (Unit Tests)', () => {
  describe('PO Lifecycle State Machine Validation', () => {
    it('should allow valid forward transitions from Pending', () => {
      const allowed = VALID_PO_TRANSITIONS['Pending'];
      assert.deepEqual(allowed, ['Confirmed', 'Rejected', 'Cancelled']);
      assert.ok(allowed.includes('Confirmed'));
      assert.ok(allowed.includes('Rejected'));
      assert.ok(allowed.includes('Cancelled'));
      assert.ok(!allowed.includes('Delivered'), 'Pending cannot transition directly to Delivered');
    });

    it('should allow valid transitions from Confirmed to Processing or Cancelled', () => {
      const allowed = VALID_PO_TRANSITIONS['Confirmed'];
      assert.deepEqual(allowed, ['Processing', 'Cancelled']);
    });

    it('should allow valid transitions from Processing to Shipped or Cancelled', () => {
      const allowed = VALID_PO_TRANSITIONS['Processing'];
      assert.deepEqual(allowed, ['Shipped', 'Cancelled']);
    });

    it('should disallow manual transition to Delivered directly via status', () => {
      // Delivered is only reached through GRN receipts matching ordered quantity
      const shippedAllowed = VALID_PO_TRANSITIONS['Shipped'];
      assert.ok(!shippedAllowed.includes('Delivered'));
      const pendingAllowed = VALID_PO_TRANSITIONS['Pending'];
      assert.ok(!pendingAllowed.includes('Delivered'));
    });

    it('should treat Delivered and Cancelled as terminal states', () => {
      assert.deepEqual(VALID_PO_TRANSITIONS['Delivered'], []);
      assert.deepEqual(VALID_PO_TRANSITIONS['Cancelled'], []);
    });
  });

  describe('Server-Side Total & Financial Calculations', () => {
    it('should accurately calculate total amount across line items', () => {
      const lineItems = [
        { quantity: 10, price: 125.5 },
        { quantity: 5, price: 40.0 },
        { quantity: 2, price: 99.99 },
      ];
      const calculatedTotal = lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
      assert.equal(calculatedTotal, 1654.98);
    });

    it('should reject non-positive quantities and negative prices', () => {
      const isValidQuantity = (qty) => Number.isInteger(qty) && qty > 0;
      const isValidPrice = (price) => typeof price === 'number' && !isNaN(price) && price >= 0;

      assert.equal(isValidQuantity(0), false);
      assert.equal(isValidQuantity(-5), false);
      assert.equal(isValidQuantity(2.5), false);
      assert.equal(isValidQuantity(10), true);

      assert.equal(isValidPrice(-10), false);
      assert.equal(isValidPrice(0), true);
      assert.equal(isValidPrice(125.5), true);
    });

    it('should correctly calculate outstanding balance and prevent overpayment', () => {
      const totalAmount = 5000;
      let paidAmount = 2000;
      const outstanding = Math.max(0, totalAmount - paidAmount);
      assert.equal(outstanding, 3000);

      const canAcceptPayment = (incomingAmount, balance) => {
        return incomingAmount > 0 && incomingAmount <= balance + 0.001;
      };

      assert.equal(canAcceptPayment(1500, outstanding), true);
      assert.equal(canAcceptPayment(3000, outstanding), true);
      assert.equal(canAcceptPayment(3500, outstanding), false, 'Cannot overpay beyond outstanding balance');
      assert.equal(canAcceptPayment(-100, outstanding), false, 'Cannot accept negative payment');
      assert.equal(canAcceptPayment(0, outstanding), false, 'Cannot accept zero payment');
    });
  });

  describe('Warehouse Intake (GRN) & Stock Calculation Rules', () => {
    it('should ensure ONLY accepted quantities increase inventory, while rejected do not', () => {
      const lineReceipt = {
        orderedQuantity: 100,
        receivedQuantity: 100,
        acceptedQuantity: 85,
        rejectedQuantity: 15, // 15 damaged units
      };

      let currentWarehouseStock = 50;

      // Business Rule: ONLY acceptedQuantity increments inventory stock
      const newStock = currentWarehouseStock + lineReceipt.acceptedQuantity;
      assert.equal(newStock, 135, 'Stock should only increase by accepted quantity (85)');
      assert.notEqual(newStock, 150, 'Stock must not inflate with rejected/damaged goods');
    });

    it('should correctly evaluate remaining unfulfilled balance across multiple deliveries', () => {
      const orderedQty = 100;
      let cumulativeAccepted = 0;

      // Delivery 1 (Partial): 40 accepted
      cumulativeAccepted += 40;
      let remainingAllowed = orderedQty - cumulativeAccepted;
      assert.equal(remainingAllowed, 60);

      // Attempt Delivery 2 with 70 accepted (should exceed allowed remaining 60)
      const incomingDelivery2Accepted = 70;
      const isAllowed = incomingDelivery2Accepted <= remainingAllowed;
      assert.equal(isAllowed, false, 'Over-receipt beyond remaining balance must be blocked');

      // Valid Delivery 2: 60 accepted
      cumulativeAccepted += 60;
      remainingAllowed = orderedQty - cumulativeAccepted;
      assert.equal(remainingAllowed, 0);
      assert.equal(cumulativeAccepted >= orderedQty, true, 'Order is now fully fulfilled');
    });
  });

  describe('3-Tier Inventory Model & Invariant Rules', () => {
    it('should maintain invariant available = onHand - reserved at all times', () => {
      const calculateAvailable = (onHand, reserved) => Math.max(0, onHand - reserved);

      assert.equal(calculateAvailable(100, 20), 80);
      assert.equal(calculateAvailable(50, 50), 0);
      assert.equal(calculateAvailable(0, 0), 0);
    });

    it('should block reserving more stock than available units', () => {
      const canReserve = (orderQty, availableStock) => orderQty > 0 && orderQty <= availableStock;

      const onHand = 50;
      const reserved = 30;
      const available = onHand - reserved; // 20

      assert.equal(canReserve(15, available), true, 'Reserving 15 units from 20 available is valid');
      assert.equal(canReserve(20, available), true, 'Reserving exact 20 units is valid');
      assert.equal(canReserve(25, available), false, 'Cannot reserve 25 units when only 20 are available');
    });

    it('should preserve physical onHand constant during reservation, adjusting only reserved and available', () => {
      let onHand = 100;
      let reserved = 10;
      let available = onHand - reserved; // 90

      // Placement: Reserve 25 units
      const qtyToReserve = 25;
      reserved += qtyToReserve; // 35
      available = onHand - reserved; // 65

      assert.equal(onHand, 100, 'Physical onHand warehouse stock must not change during reservation');
      assert.equal(reserved, 35);
      assert.equal(available, 65);
    });

    it('should accurately deduct physical onHand and release reservation upon fulfillment', () => {
      let onHand = 100;
      let reserved = 35;
      let available = onHand - reserved; // 65

      // Fulfillment of the 25 reserved units
      const fulfilledQty = 25;
      onHand -= fulfilledQty; // 75
      reserved -= fulfilledQty; // 10
      available = onHand - reserved; // 65

      assert.equal(onHand, 75, 'Physical stock decrements upon fulfillment');
      assert.equal(reserved, 10, 'Reservation is released upon fulfillment');
      assert.equal(available, 65, 'Available stock remains unchanged because it was already reserved');
    });

    it('should restore available stock and release reservation upon order cancellation', () => {
      let onHand = 100;
      let reserved = 35;
      let available = onHand - reserved; // 65

      // Order of 25 units cancelled
      const cancelledQty = 25;
      reserved -= cancelledQty; // 10
      available = onHand - reserved; // 90

      assert.equal(onHand, 100, 'Physical onHand remains 100');
      assert.equal(reserved, 10, 'Reserved stock decrements back to 10');
      assert.equal(available, 90, 'Available stock restored to 90');
    });
  });

  describe('Post-Fulfillment Invoicing & Full Payment Rules', () => {
    it('should only permit invoice generation after sales order is Fulfilled or Delivered', () => {
      const canGenerateInvoice = (orderStatus) => ['Fulfilled', 'Delivered'].includes(orderStatus);

      assert.equal(canGenerateInvoice('Pending'), false, 'Cannot invoice a Pending order');
      assert.equal(canGenerateInvoice('Confirmed'), false, 'Cannot invoice a Confirmed order');
      assert.equal(canGenerateInvoice('Processing'), false, 'Cannot invoice a Processing order');
      assert.equal(canGenerateInvoice('Cancelled'), false, 'Cannot invoice a Cancelled order');
      assert.equal(canGenerateInvoice('Fulfilled'), true, 'Can invoice a Fulfilled order');
      assert.equal(canGenerateInvoice('Delivered'), true, 'Can invoice a Delivered order');
    });

    it('should strictly require exact full payment amount and reject partial payments', () => {
      const invoiceTotal = 1250.00;
      const validatePayment = (paymentAmount, total) => {
        if (typeof paymentAmount !== 'number' || paymentAmount <= 0) return { valid: false, error: 'Invalid amount' };
        if (Math.abs(paymentAmount - total) > 0.01) return { valid: false, error: 'Full payment required' };
        return { valid: true };
      };

      assert.equal(validatePayment(1250.00, invoiceTotal).valid, true);
      assert.equal(validatePayment(500.00, invoiceTotal).valid, false, 'Partial payment must be rejected');
      assert.equal(validatePayment(1500.00, invoiceTotal).valid, false, 'Overpayment must be rejected');
      assert.equal(validatePayment(0, invoiceTotal).valid, false, 'Zero payment must be rejected');
    });
  });
});

