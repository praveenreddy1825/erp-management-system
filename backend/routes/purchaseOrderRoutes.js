import express from 'express';
import { 
  createPurchaseOrder, 
  getPurchaseOrders, 
  getPurchaseOrderById, 
  updatePurchaseOrderStatus 
} from '../controllers/purchaseOrderController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, authorizeRoles('Admin', 'Purchase_Manager'), createPurchaseOrder)
  .get(protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Supplier', 'Inventory_Manager'), getPurchaseOrders);

router.route('/:id')
  .get(protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Supplier', 'Inventory_Manager'), getPurchaseOrderById);

// Specific action route for updating order status
router.route('/:id/status')
  .put(protect, authorizeRoles('Admin', 'Purchase_Manager', 'Supplier'), updatePurchaseOrderStatus);

export default router;
