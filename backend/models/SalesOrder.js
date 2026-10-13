import mongoose from 'mongoose';

const salesOrderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Please Provide Customer Name'],
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Enter Valid quantity'],
        },
        price: {
          type: Number,
          required: true,
          min: [0, 'Enter Valid price'],
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
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'unpaid', 'partial'],
      default: 'unpaid',
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
  },
  {
    timestamps: true,
  }
);

// Performance & Filtering Indexes
salesOrderSchema.index({ customer: 1, createdAt: -1 });
salesOrderSchema.index({ status: 1 });
salesOrderSchema.index({ createdAt: -1 });

salesOrderSchema.pre('save', async function () {
  this.TotalAmount = this.products.reduce((total, item) => {
    return total + item.quantity * item.price;
  }, 0);
});

const SalesOrder = mongoose.model('SalesOrder', salesOrderSchema);
export default SalesOrder;