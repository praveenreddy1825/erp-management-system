import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';

/**
 * Centralized Inventory Service Helper
 * Enforces fundamental invariants: available = onHand - reserved; stock = onHand.
 * Uses atomic conditional updates ($gte + $inc) to guarantee concurrency safety
 * on both standalone MongoDB instances and ReplicaSet deployments.
 * All mutations record immutable StockMovement ledger entries.
 */

export const recordGoodsReceipt = async ({
  productId,
  acceptedQuantity,
  sourceDocument,
  sourceDocumentId,
  actor,
  reason = 'Goods receipt note intake verification',
  session = null,
}) => {
  if (acceptedQuantity <= 0) return null;

  const product = await Product.findOneAndUpdate(
    { _id: productId },
    {
      $inc: {
        onHand: acceptedQuantity,
        available: acceptedQuantity,
        stock: acceptedQuantity,
      },
    },
    {
      returnDocument: 'after',
      session,
    }
  );
  if (!product) throw new Error(`Product ${productId} not found during goods receipt`);

  const onHandAfter = product.onHand;
  const onHandBefore = onHandAfter - acceptedQuantity;
  const reservedBefore = product.reserved;
  const reservedAfter = product.reserved;
  const availableAfter = product.available;
  const availableBefore = availableAfter - acceptedQuantity;

  const [movement] = await StockMovement.create(
    [
      {
        product: product._id,
        quantity: acceptedQuantity,
        movementType: 'Goods_Receipt',
        sourceDocument,
        sourceDocumentId,
        sourceDocumentType: 'GRN',
        actor,
        onHandBefore,
        onHandAfter,
        reservedBefore,
        reservedAfter,
        availableBefore,
        availableAfter,
        reason,
      },
    ],
    { session }
  );

  return { product, movement };
};

export const reserveStockForOrder = async ({
  lineItems,
  sourceDocument,
  sourceDocumentId,
  actor,
  session = null,
}) => {
  // Sort deterministically by product ID string to prevent deadlocks under concurrency
  const sortedItems = [...lineItems].sort((a, b) => {
    const idA = String(a.product?._id || a.product);
    const idB = String(b.product?._id || b.product);
    return idA.localeCompare(idB);
  });

  const reservedResults = [];
  const successfullyReserved = [];

  try {
    for (const item of sortedItems) {
      const prodId = item.product?._id || item.product;
      const reqQty = parseInt(item.quantity, 10);
      if (isNaN(reqQty) || reqQty <= 0) {
        throw new Error(`Invalid order quantity for product ${prodId}`);
      }

      // Atomic conditional update: increment reserved & decrement available ONLY IF available >= reqQty
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: prodId,
          available: { $gte: reqQty },
        },
        {
          $inc: {
            reserved: reqQty,
            available: -reqQty,
          },
        },
        {
          returnDocument: 'after',
          session,
        }
      );

      if (!updatedProduct) {
        // Query to provide a clear, helpful out-of-stock error message
        const currentProd = await Product.findById(prodId).session(session);
        if (!currentProd) {
          throw new Error(`Product not found with ID ${prodId}`);
        }
        const avail = typeof currentProd.available === 'number' ? currentProd.available : currentProd.stock || 0;
        throw new Error(
          `Insufficient available stock for product "${currentProd.name}". Available: ${avail}, Requested: ${reqQty}. Please wait for stock replenishment.`
        );
      }

      successfullyReserved.push({
        productId: prodId,
        quantity: reqQty,
        product: updatedProduct,
      });
    }

    // All line items reserved successfully! Now write immutable StockMovement ledger entries
    for (const resItem of successfullyReserved) {
      const prod = resItem.product;
      const qty = resItem.quantity;
      const onHandBefore = prod.onHand;
      const onHandAfter = prod.onHand;
      const reservedAfter = prod.reserved;
      const reservedBefore = reservedAfter - qty;
      const availableAfter = prod.available;
      const availableBefore = availableAfter + qty;

      const [movement] = await StockMovement.create(
        [
          {
            product: prod._id,
            quantity: qty,
            movementType: 'Order_Reservation',
            sourceDocument,
            sourceDocumentId,
            sourceDocumentType: 'SalesOrder',
            actor,
            onHandBefore,
            onHandAfter,
            reservedBefore,
            reservedAfter,
            availableBefore,
            availableAfter,
            reason: `Stock allocated for order ${sourceDocument}`,
          },
        ],
        { session }
      );

      reservedResults.push({ product: prod, movement });
    }

    return reservedResults;
  } catch (error) {
    // Immediate compensation workflow: release any items reserved in this attempt
    // Ensures all-or-nothing atomicity even without replica-set transaction support
    for (const resItem of successfullyReserved) {
      try {
        await Product.findOneAndUpdate(
          { _id: resItem.productId },
          {
            $inc: {
              reserved: -resItem.quantity,
              available: resItem.quantity,
            },
          },
          { session }
        );
      } catch (compensationErr) {
        console.error(`Failed to compensate reservation for product ${resItem.productId}:`, compensationErr);
      }
    }
    throw error;
  }
};

export const releaseOrderReservation = async ({
  lineItems,
  sourceDocument,
  sourceDocumentId,
  actor,
  reason = 'Customer order cancellation',
  session = null,
}) => {
  const releaseResults = [];

  const sortedItems = [...lineItems].sort((a, b) => {
    const idA = String(a.product?._id || a.product);
    const idB = String(b.product?._id || b.product);
    return idA.localeCompare(idB);
  });

  for (const item of sortedItems) {
    const prodId = item.product?._id || item.product;
    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty <= 0) continue;

    // Atomic conditional decrement of reserved and increment of available
    const product = await Product.findOneAndUpdate(
      {
        _id: prodId,
        reserved: { $gte: qty },
      },
      {
        $inc: {
          reserved: -qty,
          available: qty,
        },
      },
      {
        returnDocument: 'after',
        session,
      }
    );

    if (!product) {
      continue;
    }

    const onHandBefore = product.onHand;
    const onHandAfter = product.onHand;
    const reservedAfter = product.reserved;
    const reservedBefore = reservedAfter + qty;
    const availableAfter = product.available;
    const availableBefore = availableAfter - qty;

    const [movement] = await StockMovement.create(
      [
        {
          product: product._id,
          quantity: -qty,
          movementType: 'Reservation_Release',
          sourceDocument,
          sourceDocumentId,
          sourceDocumentType: 'SalesOrder',
          actor,
          onHandBefore,
          onHandAfter,
          reservedBefore,
          reservedAfter,
          availableBefore,
          availableAfter,
          reason,
        },
      ],
      { session }
    );

    releaseResults.push({ product, movement });
  }

  return releaseResults;
};

export const fulfillOrderStock = async ({
  lineItems,
  sourceDocument,
  sourceDocumentId,
  actor,
  session = null,
}) => {
  const fulfillmentResults = [];

  const sortedItems = [...lineItems].sort((a, b) => {
    const idA = String(a.product?._id || a.product);
    const idB = String(b.product?._id || b.product);
    return idA.localeCompare(idB);
  });

  for (const item of sortedItems) {
    const prodId = item.product?._id || item.product;
    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty <= 0) continue;

    // Atomic conditional deduction of physical onHand and reserved
    const product = await Product.findOneAndUpdate(
      {
        _id: prodId,
        onHand: { $gte: qty },
        reserved: { $gte: qty },
      },
      {
        $inc: {
          onHand: -qty,
          reserved: -qty,
          stock: -qty,
        },
      },
      {
        returnDocument: 'after',
        session,
      }
    );

    if (!product) {
      const prodDoc = await Product.findById(prodId).session(session);
      if (!prodDoc) throw new Error(`Product ${prodId} not found during fulfillment`);
      throw new Error(`Cannot fulfill: On-hand physical stock for "${prodDoc.name}" is less than ordered quantity.`);
    }

    const onHandAfter = product.onHand;
    const onHandBefore = onHandAfter + qty;
    const reservedAfter = product.reserved;
    const reservedBefore = reservedAfter + qty;
    const availableAfter = product.available;
    const availableBefore = product.available;

    const [movement] = await StockMovement.create(
      [
        {
          product: product._id,
          quantity: -qty,
          movementType: 'Sales_Fulfillment',
          sourceDocument,
          sourceDocumentId,
          sourceDocumentType: 'SalesOrder',
          actor,
          onHandBefore,
          onHandAfter,
          reservedBefore,
          reservedAfter,
          availableBefore,
          availableAfter,
          reason: `Physical inventory deducted upon customer fulfillment for ${sourceDocument}`,
        },
      ],
      { session }
    );

    fulfillmentResults.push({ product, movement });
  }

  return fulfillmentResults;
};
