import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import salesOrderRoutes from './routes/salesOrderRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';  
import grnRoutes from './routes/grnRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();
app.use(cors());
app.use(express.json());

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/grns', grnRoutes);
app.use('/api/invoices', invoiceRoutes);

// Root route check
app.get('/api', (req, res) => {
    res.send('API is running... lessgooooo......');
});

// Load error handling middleware AFTER all routes
app.use(notFound);
app.use(errorHandler);

export default app;
