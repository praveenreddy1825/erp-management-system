import mongoose from 'mongoose';

const grnSchema = new mongoose.Schema(
  {
    grnNumber: {
      type: String,
      required: true,
      unique: true,
      default: function () {
        return `GRN-${Date.now()}`;
      },
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: [true, 'please provide purchase order'],
    },
    productsReceived: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
        },
        receivedDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide received by'],
    },
    remarks: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Received'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
grnSchema.index({ purchaseOrder: 1 });
grnSchema.index({ createdAt: -1 });

const GRN = mongoose.model('GRN', grnSchema);
export default GRN;