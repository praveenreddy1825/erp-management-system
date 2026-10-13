import mongoose from 'mongoose';

const purchaseOrderSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Please Provide Supplier Name'],
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
          required: [true, 'cost price is required'],
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

// Performance & Relationship Indexes
purchaseOrderSchema.index({ supplier: 1, createdAt: -1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ createdAt: -1 });

purchaseOrderSchema.pre('save', async function () {
  this.TotalAmount = this.products.reduce((total, item) => {
    return total + item.quantity * item.price;
  }, 0);
});

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
export default PurchaseOrder;