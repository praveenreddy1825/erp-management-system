import mongoose from 'mongoose';

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
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
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Enter valid quantity'],
        },
        price: {
          type: Number,
          required: [true, 'Cost price is required'],
          min: [0, 'Enter valid price'],
        },
      },
    ],
    TotalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Partially_Received', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'unpaid', 'partial'],
      default: 'unpaid',
    },
    paymentTerms: {
      type: String,
      default: 'Net 30',
      trim: true,
    },
    DateOfOrder: {
      type: Date,
      default: Date.now,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    carrier: {
      type: String,
      trim: true,
    },
    trackingNumber: {
      type: String,
      trim: true,
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
        fromStatus: { type: String },
        toStatus: { type: String, required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        notes: { type: String },
      },
    ],
    payments: [
      {
        amount: { type: Number, required: true, min: 0.01 },
        paidDate: { type: Date, default: Date.now },
        paymentMethod: { type: String, default: 'Bank Transfer' },
        reference: { type: String, trim: true },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notes: { type: String, trim: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Performance & Relationship Indexes
purchaseOrderSchema.index({ supplier: 1, createdAt: -1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ paymentStatus: 1 });
purchaseOrderSchema.index({ createdAt: -1 });

// Ensure TotalAmount calculation
purchaseOrderSchema.pre('validate', function () {
  if (!this.poNumber) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.poNumber = `PO-${dateStr}-${rand}`;
  }
  if (this.products && Array.isArray(this.products)) {
    this.TotalAmount = this.products.reduce((total, item) => {
      const qty = Number(item.quantity) || 0;
      const prc = Number(item.price) || 0;
      return total + qty * prc;
    }, 0);
  }
});

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
export default PurchaseOrder;