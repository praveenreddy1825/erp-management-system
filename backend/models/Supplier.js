import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add supplier company name'],
      trim: true,
    },
    contactInfo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: [true, 'Please enter contact info'],
    },
    userAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

supplierSchema.index({ name: 1 });
supplierSchema.index({ createdAt: -1 });

const Supplier = mongoose.model('Supplier', supplierSchema);
export default Supplier;
