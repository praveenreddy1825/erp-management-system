import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Stock movement must reference a product'],
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Stock movement must record a quantity change'],
    },
    movementType: {
      type: String,
      required: [true, 'Movement type is required'],
      enum: [
        'Goods_Receipt',
        'Order_Reservation',
        'Reservation_Release',
        'Sales_Fulfillment',
        'Stock_Adjustment',
        'Correction_Reversal',
      ],
      index: true,
    },
    sourceDocument: {
      type: String,
      required: [true, 'Movement must reference a human-readable source document identifier'],
      trim: true,
    },
    sourceDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    sourceDocumentType: {
      type: String,
      required: true,
      enum: ['GRN', 'SalesOrder', 'PurchaseOrder', 'ManualAdjustment'],
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Stock movement must record the responsible user'],
    },
    onHandBefore: {
      type: Number,
      required: true,
    },
    onHandAfter: {
      type: Number,
      required: true,
    },
    reservedBefore: {
      type: Number,
      required: true,
    },
    reservedAfter: {
      type: Number,
      required: true,
    },
    availableBefore: {
      type: Number,
      required: true,
    },
    availableAfter: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ movementType: 1, createdAt: -1 });

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
export default StockMovement;
