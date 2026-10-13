import mongoose from 'mongoose';

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
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please enter a product price'],
      min: [0, 'Enter Valid price'],
    },
    description: {
      type: String,
      required: false,
    },
    stock: {
      type: Number,
      required: [true, 'Please enter a product quantity'],
      min: [0, 'Enter Valid stock'],
      default: 1,
    },
    reorderLevel: {
      type: Number,
      required: [true, 'Please add reorder level'],
      min: [1, 'Reorder Level should be atleast 1'],
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);

// Performance & Query Indexes
productSchema.index({ category: 1 });
productSchema.index({ stock: 1, reorderLevel: 1 });
productSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);
export default Product;
