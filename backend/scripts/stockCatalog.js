import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/erp_management';

async function stockCatalog() {
  await mongoose.connect(uri);
  const products = await mongoose.connection.collection('products').find({ stock: 0 }).toArray();
  console.log(`Found ${products.length} products with 0 stock`);

  for (const p of products) {
    const qty = Math.floor(30 + Math.random() * 40); // 30 to 70 units
    await mongoose.connection.collection('products').updateOne(
      { _id: p._id },
      {
        $set: {
          stock: qty,
          onHand: qty,
          available: qty,
          reserved: 0,
          updatedAt: new Date(),
        },
      }
    );
    console.log(`Stocked ${p.name} with ${qty} units`);
  }
  console.log('Finished updating initial catalog stock!');
  await mongoose.disconnect();
}

stockCatalog().catch(console.error);
