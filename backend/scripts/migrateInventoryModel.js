import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Product from '../models/Product.js';

dotenv.config();

const migrateInventoryModel = async () => {
  try {
    await connectDB();
    console.log('--- Starting Three-Tier Inventory Model Migration ---');

    const products = await Product.find({});
    console.log(`Found ${products.length} products to check/migrate.`);

    let updatedCount = 0;
    for (const product of products) {
      const initialStock = typeof product.stock === 'number' ? product.stock : 0;
      const onHand = typeof product.onHand === 'number' ? product.onHand : initialStock;
      const reserved = typeof product.reserved === 'number' ? product.reserved : 0;
      const available = Math.max(0, onHand - reserved);

      let needsUpdate = false;
      if (product.onHand !== onHand || product.reserved !== reserved || product.available !== available || product.stock !== onHand) {
        needsUpdate = true;
      }

      if (needsUpdate) {
        product.onHand = onHand;
        product.reserved = reserved;
        product.available = available;
        product.stock = onHand;
        await product.save();
        updatedCount++;
      }
    }

    console.log(`Successfully migrated ${updatedCount} products.`);
    console.log('--- Migration Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateInventoryModel();
