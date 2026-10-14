import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesOrder',
      required: [true, 'Invoice must reference a valid sales order'],
      unique: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Invoice total cannot be negative'],
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Paid'],
      default: 'Unpaid',
      index: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
    paymentReference: {
      type: String,
      trim: true,
    },
    paidDate: {
      type: Date,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    dueDate: {
      type: Date,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ customer: 1, createdAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;