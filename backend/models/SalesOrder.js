import mongoose from 'mongoose';

const salesOrderSchema = new mongoose.Schema(
  {
    soNumber: {
      type: String,
      unique: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Please provide customer reference'],
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
        },
        price: {
          type: Number,
          required: true,
          min: [0, 'Price cannot be negative'],
        },
      },
    ],
    TotalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Processing', 'Fulfilled', 'Delivered', 'Cancelled', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    reservationStatus: {
      type: String,
      enum: ['Reserved', 'Fulfilled', 'Released'],
      default: 'Reserved',
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'unpaid', 'partial'],
      default: 'unpaid',
      index: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    DateOfOrder: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    statusHistory: [
      {
        fromStatus: { type: String, required: true },
        toStatus: { type: String, required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Performance & Filtering Indexes
salesOrderSchema.index({ customer: 1, createdAt: -1 });
salesOrderSchema.index({ status: 1, createdAt: -1 });

salesOrderSchema.pre('validate', function () {
  if (this.products && Array.isArray(this.products)) {
    this.TotalAmount = this.products.reduce((total, item) => {
      const q = typeof item.quantity === 'number' ? item.quantity : 0;
      const p = typeof item.price === 'number' ? item.price : 0;
      return total + q * p;
    }, 0);
  }
});

const SalesOrder = mongoose.model('SalesOrder', salesOrderSchema);
export default SalesOrder;