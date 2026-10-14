import express from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplierController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager'), getSuppliers)
  .post(protect, authorizeRoles('Admin', 'Purchase_Manager'), createSupplier);

router
  .route('/:id')
  .get(protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager'), getSupplierById)
  .put(protect, authorizeRoles('Admin', 'Purchase_Manager'), updateSupplier)
  .delete(protect, authorizeRoles('Admin'), deleteSupplier);

export default router;
