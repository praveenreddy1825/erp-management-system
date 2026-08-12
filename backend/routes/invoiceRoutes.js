import express from 'express';
import { 
  createInvoice, 
  getInvoices, 
  getInvoiceById 
} from '../controllers/invoiceController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, authorizeRoles('Admin', 'Sales_Manager'), createInvoice)
  .get(protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Customer', 'Supplier', 'Inventory_Manager'), getInvoices);

router.route('/:id')
  .get(protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Customer', 'Supplier', 'Inventory_Manager'), getInvoiceById);

export default router;
