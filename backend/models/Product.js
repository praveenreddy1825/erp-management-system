import mongoose from 'mongoose';

export const PRODUCT_CATEGORIES = [
  // Consumer & Retail
  'Grocery',
  'Dairy',
  'Packaged Food',
  'Beverages',
  'Personal Care',
  'Household',
  'Fashion',
  'Electronics',
  'Pharmacy',
  'Office Supplies',
  'Hardware & Tools',
  'Home & Kitchen',
  // B2B & Manufacturing ERP
  'Industrial',
  'Raw Materials',
  'Valves',
  'Pipes',
  'Machinery',
  'Chemicals',
  'Automotive',
  'Packaging',
];


const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter a product name'],
      trim: true,
    },
    SKU: {
      type: String,
      required: [true, 'please add unique product identifier(SKU)'],
      uppercase: true,
      trim: true,
      unique: true,
    },
    category: {
      type: String,
      required: [true, 'Please add a product category'],
      enum: {
        values: PRODUCT_CATEGORIES,
        message: '{VALUE} is not a recognized product category',
      },
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please enter a product selling price'],
      min: [0, 'Enter valid price'],
    },
    costPrice: {
      type: Number,
      default: 0,
      min: [0, 'Enter valid cost price'],
    },
    description: {
      type: String,
      required: false,
    },
    // Physically accepted inventory present in warehouse
    onHand: {
      type: Number,
      required: true,
      min: [0, 'On-hand stock cannot be negative'],
      default: 0,
    },
    // Stock allocated to active unfulfilled customer sales orders
    reserved: {
      type: Number,
      required: true,
      min: [0, 'Reserved stock cannot be negative'],
      default: 0,
    },
    // Available stock that can be ordered: available = onHand - reserved
    available: {
      type: Number,
      required: true,
      min: [0, 'Available stock cannot be negative'],
      default: 0,
    },
    // Retained for backward compatibility with existing views, synced with onHand
    stock: {
      type: Number,
      min: [0, 'Enter valid stock'],
      default: 0,
    },
    reorderLevel: {
      type: Number,
      required: [true, 'Please add reorder level'],
      min: [1, 'Reorder Level should be at least 1'],
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);

// Invariant calculation: available = onHand - reserved; stock = onHand
productSchema.pre('validate', function () {
  if (this.isNew) {
    if (this.onHand === undefined || (this.onHand === 0 && typeof this.stock === 'number' && this.stock > 0)) {
      this.onHand = this.stock;
    }
  }
  if (this.onHand === undefined) {
    this.onHand = typeof this.stock === 'number' ? this.stock : 0;
  }
  if (this.reserved === undefined) {
    this.reserved = 0;
  }
  if (this.onHand < 0) this.onHand = 0;
  if (this.reserved < 0) this.reserved = 0;

  this.available = Math.max(0, this.onHand - this.reserved);
  this.stock = this.onHand;
});

// Reservation boundary guard
productSchema.path('reserved').validate(function (value) {
  if (this.onHand === undefined) return true;
  return value <= this.onHand;
}, 'Reserved stock cannot exceed on-hand stock');

// Performance & Query Indexes
productSchema.index({ category: 1 });
productSchema.index({ available: 1, reorderLevel: 1 });
productSchema.index({ onHand: 1, reserved: 1 });
productSchema.index({ stock: 1, reorderLevel: 1 });
productSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);
export default Product;
