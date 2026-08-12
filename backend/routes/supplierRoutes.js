import express from 'express';
import { 
  getSuppliers, 
  createSupplier, 
  updateSupplier, 
  deleteSupplier 
} from '../controllers/supplierController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Supplier', 'Inventory_Manager'), getSuppliers)
  .post(protect, authorizeRoles('Admin', 'Purchase_Manager'), createSupplier);

router.route('/:id')
  .put(protect, authorizeRoles('Admin', 'Purchase_Manager', 'Supplier'), updateSupplier)
  .delete(protect, authorizeRoles('Admin'), deleteSupplier);

export default router;
