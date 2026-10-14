import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';

/**
 * Centralized Inventory Service Helper
 * Enforces fundamental invariants: available = onHand - reserved; stock = onHand.
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

  const product = await Product.findById(productId).session(session);
  if (!product) throw new Error(`Product ${productId} not found during goods receipt`);

  const onHandBefore = product.onHand || 0;
  const reservedBefore = product.reserved || 0;
  const availableBefore = product.available || 0;

  product.onHand = onHandBefore + acceptedQuantity;
  product.stock = product.onHand;
  product.available = Math.max(0, product.onHand - product.reserved);

  await product.save({ session });

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
        onHandAfter: product.onHand,
        reservedBefore,
        reservedAfter: product.reserved,
        availableBefore,
        availableAfter: product.available,
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
  const reservedResults = [];

  for (const item of lineItems) {
    const prodId = item.product?._id || item.product;
    const reqQty = parseInt(item.quantity, 10);
    if (isNaN(reqQty) || reqQty <= 0) {
      throw new Error(`Invalid order quantity for product ${prodId}`);
    }

    // Atomic fetch with availability guard
    const product = await Product.findById(prodId).session(session);
    if (!product) throw new Error(`Product ${prodId} not found`);

    if (product.available < reqQty) {
      throw new Error(
        `Insufficient available stock for "${product.name}". Requested: ${reqQty}, Available: ${product.available}`
      );
    }

    const onHandBefore = product.onHand;
    const reservedBefore = product.reserved;
    const availableBefore = product.available;

    product.reserved += reqQty;
    product.available = Math.max(0, product.onHand - product.reserved);

    await product.save({ session });

    const [movement] = await StockMovement.create(
      [
        {
          product: product._id,
          quantity: reqQty,
          movementType: 'Order_Reservation',
          sourceDocument,
          sourceDocumentId,
          sourceDocumentType: 'SalesOrder',
          actor,
          onHandBefore,
          onHandAfter: product.onHand,
          reservedBefore,
          reservedAfter: product.reserved,
          availableBefore,
          availableAfter: product.available,
          reason: `Stock allocated for order ${sourceDocument}`,
        },
      ],
      { session }
    );

    reservedResults.push({ product, movement });
  }

  return reservedResults;
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

  for (const item of lineItems) {
    const prodId = item.product?._id || item.product;
    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty <= 0) continue;

    const product = await Product.findById(prodId).session(session);
    if (!product) continue;

    const onHandBefore = product.onHand;
    const reservedBefore = product.reserved;
    const availableBefore = product.available;

    product.reserved = Math.max(0, product.reserved - qty);
    product.available = Math.max(0, product.onHand - product.reserved);

    await product.save({ session });

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
          onHandAfter: product.onHand,
          reservedBefore,
          reservedAfter: product.reserved,
          availableBefore,
          availableAfter: product.available,
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

  for (const item of lineItems) {
    const prodId = item.product?._id || item.product;
    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty <= 0) continue;

    const product = await Product.findById(prodId).session(session);
    if (!product) throw new Error(`Product ${prodId} not found during fulfillment`);

    if (product.onHand < qty) {
      throw new Error(`Cannot fulfill: On-hand physical stock for "${product.name}" is less than ordered quantity.`);
    }

    const onHandBefore = product.onHand;
    const reservedBefore = product.reserved;
    const availableBefore = product.available;

    product.onHand = Math.max(0, product.onHand - qty);
    product.reserved = Math.max(0, product.reserved - qty);
    product.available = Math.max(0, product.onHand - product.reserved);
    product.stock = product.onHand;

    await product.save({ session });

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
          onHandAfter: product.onHand,
          reservedBefore,
          reservedAfter: product.reserved,
          availableBefore,
          availableAfter: product.available,
          reason: `Physical inventory deducted upon customer fulfillment for ${sourceDocument}`,
        },
      ],
      { session }
    );

    fulfillmentResults.push({ product, movement });
  }

  return fulfillmentResults;
};
