import express from 'express';
import { 
  getCustomers, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer 
} from '../controllers/customerController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Customer', 'Inventory_Manager'), getCustomers)
  .post(protect, authorizeRoles('Admin', 'Sales_Manager'), createCustomer);

router.route('/:id')
  .put(protect, authorizeRoles('Admin', 'Sales_Manager', 'Customer'), updateCustomer)
  .delete(protect, authorizeRoles('Admin'), deleteCustomer);

export default router;
