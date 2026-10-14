import mongoose from 'mongoose';

const grnSchema = new mongoose.Schema(
  {
    grnNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: [true, 'Please provide purchase order reference'],
    },
    productsReceived: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        orderedQuantity: {
          type: Number,
          default: 1,
          min: [0, 'Ordered quantity cannot be negative'],
        },
        receivedQuantity: {
          type: Number,
          default: 0,
          min: [0, 'Received quantity cannot be negative'],
        },
        acceptedQuantity: {
          type: Number,
          default: 0,
          min: [0, 'Accepted quantity cannot be negative'],
        },
        rejectedQuantity: {
          type: Number,
          default: 0,
          min: [0, 'Rejected quantity cannot be negative'],
        },
        rejectionReason: {
          type: String,
          trim: true,
        },
        receivedDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    deliveryReference: {
      type: String,
      trim: true,
    },
    packingSlipNumber: {
      type: String,
      trim: true,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please specify receiving employee'],
    },
    remarks: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Completed', 'Cancelled', 'Received'],
      default: 'Completed',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
grnSchema.index({ purchaseOrder: 1, createdAt: -1 });
grnSchema.index({ createdAt: -1 });

grnSchema.pre('validate', function () {
  if (!this.grnNumber) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.grnNumber = `GRN-${dateStr}-${rand}`;
  }
});

const GRN = mongoose.model('GRN', grnSchema);
export default GRN;