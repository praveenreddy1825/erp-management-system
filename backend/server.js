import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js'
import customerRoutes from './routes/customerRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import salesOrderRoutes from './routes/salesOrderRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';  
import grnRoutes from './routes/grnRoutes.js';
import {notFound,errorHandler} from './middleware/errorMiddleware.js';
//configuing dotenv variables.
dotenv.config();
connectDB();//setting up dats base connection.
const app=express();
const PORT=process.env.PORT || 9999;
app.use(cors());//setting up cors.
app.use(express.json());//setting up body parser.
//Resister with authRoutes.
app.use('/api/auth',authRoutes);
app.use('/api/products',productRoutes);
app.use('/api/customers',customerRoutes);
app.use('/api/suppliers',supplierRoutes);
app.use('/api/sales-orders',salesOrderRoutes);
app.use('/api/purchase-orders',purchaseOrderRoutes);
app.use('/api/grns',grnRoutes);
app.use('/api/invoices',invoiceRoutes);

// Root route check
app.get('/api', (req, res) => {
    res.send('API is running... lessgooooo......');
});

// Load error handling middleware AFTER all routes
app.use(notFound);
app.use(errorHandler);



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Database connected to ${process.env.MONGO_URI}`);
});

